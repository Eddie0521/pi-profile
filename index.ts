import type {
	ExtensionAPI,
	ToolCallEvent,
	ToolCallEventResult,
} from "@earendil-works/pi-coding-agent";

import {
	type Profile,
	loadProfile,
	listProfiles,
	setActiveProfileName,
	resolveProfileName,
	ensureProfilesDir,
} from "./profile-loader.ts";
import { createProfileAutocomplete } from "./autocomplete.ts";
import {
	syncSubagents,
	removeSubagents,
	cleanupAllManaged,
	formatSubagentList,
} from "./subagent-sync.ts";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Module state ───────────────────────────────────────────────────

let currentProfile: Profile | null = null;

function getCurrentProfile(): Profile | null {
	return currentProfile;
}

// ── Profile application ────────────────────────────────────────────

async function applyProfile(
	name: string,
	pi: ExtensionAPI,
	ctx?: {
		waitForIdle?(): Promise<void>;
		modelRegistry?: { find(provider: string, id: string): unknown };
		ui?: {
			notify(msg: string, type?: string): void;
			setStatus(key: string, text: string | undefined): void;
			setTitle(title: string): void;
			theme: {
				fg(semantic: string, text: string): string;
			};
		};
	},
): Promise<boolean> {
	const profile = await loadProfile(name);
	if (!profile) {
		ctx?.ui?.notify(`❌ Profile '${name}' not found`, "error");
		return false;
	}

	// Wait for agent to be idle if switching mid-session
	if (ctx?.waitForIdle) {
		await ctx.waitForIdle();
	}

	// 1. Model switching
	await applyModelSettings(profile, pi, ctx);

	// 2. Session name
	applySessionName(profile, pi);

	// 3. Cleanup previous profile's subagent files
	if (currentProfile?.subagents) {
		await removeSubagents(currentProfile.name);
	}

	// 4. Sync new profile's subagents to pi-subagents .md files
	if (profile.subagents && Object.keys(profile.subagents).length > 0) {
		const conflicts = await syncSubagents(profile);
		if (conflicts.length > 0) {
			ctx?.ui?.notify?.(
				`⚠️ Subagent conflict: ${conflicts.join(", ")} already exist in agents/ and are not profile-managed. Skipping.`,
				"warn",
			);
		} else {
			const count = Object.keys(profile.subagents).length;
			ctx?.ui?.notify?.(`📋 Synced ${count} subagent(s) to pi-subagents`, "info");
		}
	} else if (profile.subagents) {
		// Profile has subagents field but all disabled / empty — ensure no stale files
		await removeSubagents(profile.name);
	}

	// 5. Record switch in session
	pi.appendEntry("profile_switch", {
		from: currentProfile?.name ?? "default",
		to: name,
		timestamp: Date.now(),
	});

	// 6. Persist active profile
	await setActiveProfileName(name);

	// 7. Update state
	currentProfile = profile;

	// 8. Show profile in status bar (compact, themed)
	const displayName = profile.label || profile.name;
	const statusText = ctx?.ui?.theme
		? ctx.ui.theme.fg("accent", displayName)
		: displayName;
	ctx?.ui?.setStatus("profile", statusText ?? displayName);
	ctx?.ui?.notify(`✅ Switched to ${displayName}`, "info");
	return true;
}

// ── Extracted helper functions (reduce complexity) ─────────────────

/**
 * Apply model and thinking level from a profile.
 */
async function applyModelSettings(
	profile: Profile,
	pi: ExtensionAPI,
	ctx?: { modelRegistry?: { find(provider: string, id: string): unknown }; ui?: { notify(msg: string, type?: string): void } },
): Promise<void> {
	if (!profile.model?.provider || !profile.model?.model) return;

	// modelRegistry.find uses (provider, id) signature — see pi docs
	const registry = ctx && "modelRegistry" in ctx
		? (ctx as { modelRegistry: { find(provider: string, id: string): unknown } }).modelRegistry
		: null;
	if (registry) {
		try {
			const model = registry.find(profile.model.provider, profile.model.model);
			if (model) {
				const ok = await pi.setModel(model);
				if (!ok) {
					ctx?.ui?.notify?.("⚠️ 切换模型失败：无有效 API key", "warn");
				}
			}
		} catch {
			ctx?.ui?.notify?.("⚠️ 切换模型失败：模型不可用", "warn");
		}
	}

	if (profile.model.thinkingLevel) {
		try {
			const level = profile.model.thinkingLevel as "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
			pi.setThinkingLevel(level);
		} catch { /* not supported by this model */ }
	}
}

/**
 * Set session name from profile.
 */
function applySessionName(profile: Profile, pi: ExtensionAPI): void {
	const name = profile.sessionName ?? profile.label ?? profile.name;
	pi.setSessionName(name);
}

// ── Skill hard-blocking helpers ────────────────────────────────────

/**
 * Layer 1: Filter the <available_skills> XML block in the system prompt
 * to only include skills listed in allowedSkills.
 *
 * Parses the XML with regex, removes non-matching <skill> entries,
 * and reconstructs the block. If no <available_skills> block is found
 * the prompt is returned unchanged.
 */
function filterSkillsInPrompt(systemPrompt: string, allowedSkills: string[]): string {
	const allowedSet = new Set(allowedSkills);

	const blockRegex = /<available_skills>[\s\S]*?<\/available_skills>/;
	const blockMatch = systemPrompt.match(blockRegex);
	if (!blockMatch) return systemPrompt;

	const originalBlock = blockMatch[0];

	// Parse individual <skill> entries
	const skillRegex = /<skill>[\s\S]*?<\/skill>/g;
	const keptSkills: string[] = [];
	let skillMatch: RegExpExecArray | null;
	while ((skillMatch = skillRegex.exec(originalBlock)) !== null) {
		const skillBlock = skillMatch[0];
		const nameMatch = skillBlock.match(/<name>\s*([^<]+?)\s*<\/name>/);
		if (nameMatch && allowedSet.has(nameMatch[1].trim())) {
			keptSkills.push(skillBlock);
		}
	}

	const newBlock = keptSkills.length > 0
		? `<available_skills>\n${keptSkills.join('\n')}\n</available_skills>`
		: '<available_skills>\n</available_skills>';

	return systemPrompt.replace(originalBlock, newBlock);
}

/**
 * Layer 2: Check if a read tool call targets a non-profile SKILL.md file.
 *
 * Extracts the skill name from the path based on Pi's skill directory layout:
 *   - [skills]/[name]/SKILL.md  → name from directory
 *   - [skills]/[name].md        → name from filename
 * Returns true if the path IS a skill file whose name is NOT in the allowed list.
 */
function isNonProfileSkillPath(path: string, allowedSkills: string[]): boolean {
	const normalizedPath = path.replace(/\\/g, '/');

	const skillsMarker = '/skills/';
	const skillsIndex = normalizedPath.indexOf(skillsMarker);
	if (skillsIndex === -1) return false;

	const afterSkills = normalizedPath.slice(skillsIndex + skillsMarker.length);

	let skillName: string | null = null;

	if (afterSkills.endsWith('/SKILL.md')) {
		// Directory-based: skills/hunt/SKILL.md → "hunt"
		skillName = afterSkills.split('/')[0];
	} else if (afterSkills.endsWith('.md') && !afterSkills.includes('/')) {
		// Flat file: skills/hunt.md → "hunt"
		skillName = afterSkills.replace(/\.md$/, '');
	}

	if (!skillName) return false;
	return !allowedSkills.includes(skillName);
}

/**
 * Extract the skill name from a path for error messaging.
 * Mirrors the logic in isNonProfileSkillPath.
 */
function extractSkillNameFromPath(path: string): string {
	const normalizedPath = path.replace(/\\/g, '/');
	const skillsIndex = normalizedPath.indexOf('/skills/');
	if (skillsIndex === -1) return path;

	const afterSkills = normalizedPath.slice(skillsIndex + 8);

	if (afterSkills.endsWith('/SKILL.md')) {
		return afterSkills.split('/')[0];
	} else if (afterSkills.endsWith('.md') && !afterSkills.includes('/')) {
		return afterSkills.replace(/\.md$/, '');
	}
	return path;
}

/**
 * Show current profile status and available profiles list.
 */
async function showProfileStatus(ctx: { ui: { notify(msg: string, type?: string): void } }): Promise<void> {
	const current = getCurrentProfile();
	const allProfiles = await listProfiles();
	const lines: string[] = [];

	if (current) {
		lines.push(`Current: ${current.label || current.name}`);
		lines.push("");
	}

	lines.push("Available profiles:");
	for (const p of allProfiles) {
		const marker = p.name === current?.name ? " →" : "  ";
		lines.push(
			`  ${marker} /${p.name}  ${p.label || p.name}${p.description ? ` — ${p.description}` : ""}`,
		);
	}
	lines.push("");
	lines.push("Usage: /profile <name>     to switch (e.g. /profile researcher)");
	lines.push("       /profile create       interactive menu (ai / manual)");
	lines.push("       /profile create ai    AI-guided creation");
	lines.push("       /profile create manual  Step-by-step wizard");

	// Append available subagents for current profile
	if (current?.subagents) {
		const subList = formatSubagentList(current);
		if (subList) lines.push("", subList.trim());
	}

	ctx.ui.notify(lines.join("\n"), "info");
}

/**
 * Handle /profile create — dual-path entry.
 * Shows a menu: [🤖 Create with pi] or [📝 Manual wizard].
 */
async function handleCreateProfile(
	pi: ExtensionAPI,
	ctx: {
		ui: {
			select(title: string, options: string[]): Promise<string | undefined>;
			notify(msg: string, type?: string): void;
		};
	},
): Promise<void> {
	const choice = await ctx.ui.select("How to create a profile?", [
		"🤖  Create with pi — Describe your intent, I'll generate it",
		"📝  Manual — Full step-by-step wizard covering all options",
	]);

	if (!choice) return;

	if (choice.startsWith("🤖")) {
		await handleCreateWithPi(ctx);
	} else {
		await handleManualCreate(pi, ctx as any);
	}
}

/**
 * Path A: 🤖 Create with pi — AI-guided.
 * Notifies user to describe their intent; the profile-create skill handles the rest.
 */
async function handleCreateWithPi(ctx: {
	ui: { notify(msg: string, type?: string): void };
}): Promise<void> {
	ctx.ui.notify(
		"🤖  Tell me what kind of profile you need — for example:\n" +
		'  • "I want a read-only code review profile for Rust projects"\n' +
		'  • "I need a documentation writing mode with web search"\n' +
		'  • "Create a safe mode for demo sessions, no write access"\n' +
		"\nI'll ask a few questions and then generate the profile for you.",
		"info",
	);
}

/**
 * Path B: 📝 Manual — full 5-step interactive wizard.
 * Steps: 1) Identity, 2) System prompt, 3) Model binding, 4) Skills, 5) Session name.
 */
async function handleManualCreate(
	pi: ExtensionAPI,
	ctx: {
		ui: {
			input(title: string, placeholder?: string): Promise<string | undefined>;
			editor(title: string, prefill?: string): Promise<string | undefined>;
			select(title: string, options: string[]): Promise<string | undefined>;
			confirm(title: string, message: string): Promise<boolean>;
			notify(msg: string, type?: string): void;
		};
	},
): Promise<void> {
	// ── Step 1: Basic info ───────────────────────────────────────
	const name = await ctx.ui.input("Step 1/5 — Profile name (required)", "e.g. code-reviewer");
	if (!name) return;

	const label = await ctx.ui.input("Step 1/5 — Display label", `e.g. 🔬 ${name}`);
	const description = await ctx.ui.input(
		"Step 1/5 — Short description (shown in profile list)",
		"e.g. Focused code review for Rust projects",
	);

	// ── Step 2: System prompt ────────────────────────────────────
	const systemPrompt = await ctx.ui.editor(
		"Step 2/5 — System prompt (optional)\nDefines the AI's role, tone, and behavior. Appended to Pi's default prompt each turn. Leave empty to inherit the default.",
		"",
	);

	// ── Step 3: Model binding ────────────────────────────────────
	const bindModel = await ctx.ui.confirm(
		"Step 3/5 — Model binding",
		"Bind a specific model + thinking level to this profile?",
	);
	let model: Profile["model"] = undefined;
	if (bindModel) {
		const provider = await ctx.ui.input("  Provider", "e.g. anthropic, google, opencode-go");
		const modelId = await ctx.ui.input("  Model ID", "e.g. claude-sonnet-4-20250514, kimi-k2.6");
		if (provider && modelId) {
			model = { provider, model: modelId };
			const thinkingStr = await ctx.ui.select("  Thinking level", [
				"(no override)",
				"off",
				"low",
				"medium",
				"high",
			]);
			if (thinkingStr && thinkingStr !== "(no override)") {
				model.thinkingLevel = thinkingStr;
			}
		}
	}

	// ── Step 4: Skills binding ───────────────────────────────────
	const bindSkills = await ctx.ui.confirm(
		"Step 4/5 — Skills binding",
		"Restrict which skills the LLM knows about? Non-selected skills become completely invisible.",
	);
	let skills: string[] | undefined = undefined;
	if (bindSkills) {
		const skillsStr = await ctx.ui.input(
			"  Skill names (comma-separated)",
			"check, hunt, learn, wiki-read, wiki-write",
		);
		if (skillsStr) {
			skills = skillsStr.split(",").map((s) => s.trim()).filter(Boolean);
		}
	}

	// ── Step 5: Session name ─────────────────────────────────────
	const sessionName = await ctx.ui.input(
		"Step 5/5 — Session name (optional)\nAuto-names sessions when using this profile.",
		"",
	);

	// ── Build and write ──────────────────────────────────────────
	const profile: Profile = {
		name,
		label: label || undefined,
		description: description || undefined,
		systemPrompt: systemPrompt || undefined,
		model,
		skills,
		sessionName: sessionName || undefined,
	};

	const dir = join(homedir(), ".pi", "profiles");
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${name}.json`), JSON.stringify(profile, null, 2), "utf-8");

	ctx.ui.notify(`✅ Profile '${name}' created at ~/.pi/profiles/${name}.json`, "info");

	// ── Offer to switch ──────────────────────────────────────────
	const switchNow = await ctx.ui.confirm(
		"Switch now?",
		`Switch to profile '${name}' immediately?`,
	);
	if (switchNow) {
		await applyProfile(name, pi, { ui: ctx.ui });
	}
}

/**
 * Handle /profile show <name>.
 */
async function handleShowProfile(name: string | undefined, ctx: { ui: { notify(msg: string, type?: string): void } }): Promise<void> {
	if (!name) {
		ctx.ui.notify("Usage: /profile show <name>", "error");
		return;
	}
	const profile = await loadProfile(name);
	if (!profile) {
		ctx.ui.notify(`❌ Profile '${name}' not found`, "error");
		return;
	}
	ctx.ui.notify(JSON.stringify(profile, null, 2), "info");
}

/**
 * Handle /profile list.
 */
async function handleListProfiles(ctx: { ui: { notify(msg: string, type?: string): void } }): Promise<void> {
	const allProfiles = await listProfiles();
	const current = getCurrentProfile();
	const lines = ["Available profiles:"];
	for (const p of allProfiles) {
		const marker = p.name === current?.name ? " →" : "  ";
		lines.push(
			`  ${marker} ${p.name}${p.label ? `  ${p.label}` : ""}${p.description ? `  — ${p.description}` : ""}`,
		);
	}
	ctx.ui.notify(lines.join("\n"), "info");
}

/**
 * Handle /profile rm <name>.
 */
async function handleRemoveProfile(name: string | undefined, ctx: { ui: { notify(msg: string, type?: string): void } }): Promise<void> {
	if (!name || name === "default") {
		ctx.ui.notify("Cannot remove default profile", "error");
		return;
	}
	try {
		await unlink(join(homedir(), ".pi", "profiles", `${name}.json`));
		await removeSubagents(name);
		ctx.ui.notify(`🗑️ Profile '${name}' deleted`, "info");
	} catch {
		ctx.ui.notify(`❌ Profile '${name}' not found`, "error");
	}
}

// ── Extension entry ────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	// ── CLI flag ────────────────────────────────────────────────
	pi.registerFlag("profile", {
		description: "Start with a specific profile (e.g. researcher, social)",
		type: "string",
		default: "",
	});

	// ── Session start: apply CLI/env/saved profile ──────────────
	pi.on("session_start", async (_event, ctx) => {
		await ensureProfilesDir();

		// Clean up orphaned managed agent files (profile .json deleted while offline)
		await cleanupAllManaged();

		const flagValue = pi.getFlag("profile");
		const profileName = resolveProfileName(flagValue);

		// Check if profile was explicitly specified (flag or env var)
		const explicitFlag =
			typeof pi.getFlag("profile") === "string" &&
			(pi.getFlag("profile") as string).length > 0;
		const explicitEnv =
			typeof process.env.PI_PROFILE === "string" &&
			process.env.PI_PROFILE.length > 0;
		const explicitlySpecified = explicitFlag || explicitEnv;

		if (profileName !== "default" || explicitlySpecified) {
			await applyProfile(profileName, pi, ctx);
		} else {
			currentProfile = null;
			// Show default profile in status bar
			const defaultText = ctx?.ui?.theme
				? ctx.ui.theme.fg("accent", "⚡ Default")
				: "⚡ Default";
			ctx?.ui?.setStatus("profile", defaultText ?? "⚡ Default");
		}

		// Register autocomplete filter once
		ctx.ui.addAutocompleteProvider((current) =>
			createProfileAutocomplete(current, getCurrentProfile),
		);
	});

	// ── /profile command ────────────────────────────────────────
	pi.registerCommand("profile", {
		description: "Manage profiles: list, show, create",
		getArgumentCompletions: async (partial) => {
			const all = await listProfiles();
			const lowerPartial = partial.toLowerCase();
			return all
				.filter(
					(p) =>
						p.name.toLowerCase().startsWith(lowerPartial) ||
						(p.label ?? "").toLowerCase().includes(lowerPartial) ||
						(p.description ?? "").toLowerCase().includes(lowerPartial),
				)
				.map((p) => ({ value: p.name, label: `${p.label || p.name}` }));
		},
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/);
			const subcmd = parts[0]?.toLowerCase() ?? "";

			// /profile (no args) — show current + list
			if (!subcmd) {
				await showProfileStatus(ctx);
				return;
			}

			// /profile create — dual-path: --ai / --manual / menu
			if (subcmd === "create") {
				const arg2 = parts[1]?.toLowerCase();
				if (arg2 === "--ai" || arg2 === "ai") {
					await handleCreateWithPi(ctx);
				} else if (arg2 === "--manual" || arg2 === "manual") {
					await handleManualCreate(pi, ctx);
				} else {
					await handleCreateProfile(pi, ctx);
				}
				return;
			}

			// /profile show <name>
			if (subcmd === "show") {
				await handleShowProfile(parts[1], ctx);
				return;
			}

			// /profile list
			if (subcmd === "list") {
				await handleListProfiles(ctx);
				return;
			}

			// /profile rm <name>
			if (subcmd === "rm" || subcmd === "remove" || subcmd === "delete") {
				await handleRemoveProfile(parts[1], ctx);
				return;
			}

			// /profile <name> — switch to named profile
			const profile = await loadProfile(subcmd);
			if (!profile) {
				ctx.ui.notify(
					`❌ Unknown profile '${subcmd}'. Try: /profile list`,
					"error",
				);
				return;
			}

			await applyProfile(subcmd, pi, ctx);
		},
	});

	// ── before_agent_start: inject profile system prompt ─
	pi.on("before_agent_start", (event, _ctx) => {
		const profile = getCurrentProfile();
		if (!profile || profile.name === "default") return;

		let systemPrompt = event.systemPrompt;

		// Layer 1: Filter <available_skills> XML to only profile-allowed skills
		if (profile.skills && profile.skills.length > 0) {
			systemPrompt = filterSkillsInPrompt(systemPrompt, profile.skills);
		}

		// Build profile identity block (appended)
		let profilePrompt = `\n\n---\n[${profile.label || profile.name}]\n`;
		if (profile.systemPrompt) {
			profilePrompt += profile.systemPrompt;
		}
		if (profile.description) {
			profilePrompt += `\n\n${profile.description}`;
		}

		// Append available subagents info so LLM knows it can delegate
		const subagentInfo = formatSubagentList(profile);
		if (subagentInfo) {
			profilePrompt += `\n${subagentInfo}`;
		}

		return {
			systemPrompt: systemPrompt + profilePrompt,
		};
	});

	// ── tool_call: Layer 2 — block read on non-profile skill files ──
	pi.on(
		"tool_call",
		(
			event: ToolCallEvent,
			_ctx,
		): ToolCallEventResult | undefined => {
			const profile = getCurrentProfile();
			if (!profile || profile.name === "default") return undefined;
			if (!profile.skills || profile.skills.length === 0) return undefined;

			// Only block read on non-profile SKILL.md files
			if (event.toolName === "read") {
				const input = event.input as Record<string, unknown>;
				const path = typeof input.path === "string" ? input.path : "";
				if (path && isNonProfileSkillPath(path, profile.skills)) {
					return {
						block: true,
						reason: `🔒 Skill '${extractSkillNameFromPath(path)}' is not available in profile '${profile.name}'`,
					};
				}
			}

			return undefined;
		},
	);


}
 
