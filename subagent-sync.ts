/**
 * subagent-sync.ts — Sync profile-defined subagents to pi-subagents agent .md files.
 *
 * Bridge between pi-profile and pi-subagents:
 *   pi-profile  writes  →  ~/.pi/agent/agents/<name>.md  →  pi-subagents reads
 *
 * Uses a manifest at ~/.pi/profiles/.subagent-manifest.json to track which files
 * are profile-managed, so user-created agent files are never overwritten or deleted.
 */

import { writeFile, unlink, readFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { PROFILES_DIR } from "./profile-loader.ts";
import type { Profile, ProfileSubagent } from "./profile-loader.ts";

// ── Paths ──────────────────────────────────────────────────────────

const AGENTS_DIR = join(getAgentDir(), "agents");
const MANIFEST_PATH = join(PROFILES_DIR, ".subagent-manifest.json");

interface Manifest {
	[profileName: string]: string[]; // profile name → agent file names written
}

// ── Manifest read/write ────────────────────────────────────────────

async function readManifest(): Promise<Manifest> {
	try {
		const raw = await readFile(MANIFEST_PATH, "utf-8");
		return JSON.parse(raw) as Manifest;
	} catch {
		return {};
	}
}

async function writeManifest(m: Manifest): Promise<void> {
	await mkdir(PROFILES_DIR, { recursive: true });
	await writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2), "utf-8");
}

// ── Agent .md generation ───────────────────────────────────────────

/**
 * Generate the .md content for a subagent from its profile config.
 * Maps ProfileSubagent fields to pi-subagents' frontmatter field names.
 */
function generateAgentMd(name: string, config: ProfileSubagent): string {
	const fm: Record<string, string | boolean | number | undefined> = {};
	fm.name = name;
	if (config.displayName) fm.display_name = config.displayName;
	if (config.description) fm.description = config.description;

	// Model: combine provider/model
	if (config.model?.provider && config.model?.model) {
		fm.model = `${config.model.provider}/${config.model.model}`;
	} else if (config.model?.model) {
		fm.model = config.model.model;
	}

	// Thinking: ProfileSubagent.thinkingLevel → frontmatter thinking
	if (config.thinkingLevel) fm.thinking = config.thinkingLevel;

	// Tools: whitelist → tools CSV
	const toolNames = config.tools?.whitelist;
	if (toolNames && toolNames.length > 0) {
		fm.tools = toolNames.join(", ");
	}

	// Disallowed tools: merge explicit disallowedTools + blacklist
	const disallowed = new Set(config.disallowedTools ?? []);
	if (config.tools?.blacklist) {
		for (const t of config.tools.blacklist) disallowed.add(t);
	}
	if (disallowed.size > 0) {
		fm.disallowed_tools = [...disallowed].join(", ");
	}

	// CSV fields
	if (config.skills && config.skills.length > 0) {
		fm.skills = config.skills.join(", ");
	}
	if (config.excludeExtensions && config.excludeExtensions.length > 0) {
		fm.exclude_extensions = config.excludeExtensions.join(", ");
	}

	// Extensions (boolean or string[])
	if (config.extensions !== undefined) {
		if (Array.isArray(config.extensions)) {
			fm.extensions = config.extensions.join(", ");
		} else {
			fm.extensions = config.extensions;
		}
	}

	// Numeric
	if (config.maxTurns !== undefined) fm.max_turns = config.maxTurns;

	// Boolean flags (only when explicitly set)
	if (config.persistSession !== undefined) fm.persist_session = config.persistSession;
	if (config.inheritContext !== undefined) fm.inherit_context = config.inheritContext;
	if (config.runInBackground !== undefined) fm.run_in_background = config.runInBackground;
	if (config.isolated !== undefined) fm.isolated = config.isolated;
	if (config.enabled !== undefined) fm.enabled = config.enabled;

	// String enums
	if (config.sessionDir) fm.session_dir = config.sessionDir;
	if (config.promptMode) fm.prompt_mode = config.promptMode;
	if (config.isolation) fm.isolation = config.isolation;
	if (config.memory) fm.memory = config.memory;

	// Build frontmatter YAML
	const fmLines = ["---"];
	for (const [key, val] of Object.entries(fm)) {
		if (val === undefined) continue;
		if (typeof val === "boolean") {
			fmLines.push(`${key}: ${val}`);
		} else if (typeof val === "number") {
			fmLines.push(`${key}: ${val}`);
		} else {
			fmLines.push(`${key}: ${String(val)}`);
		}
	}
	fmLines.push("---");

	// Body
	const body = config.systemPrompt ? `\n${config.systemPrompt.trim()}\n` : "";
	return fmLines.join("\n") + body;
}

// ── Conflict check ─────────────────────────────────────────────────

/**
 * Check which wanted agent names conflict with user-owned files.
 * A conflict is a file in AGENTS_DIR that exists but is NOT tracked in
 * the manifest for this profile.
 */
async function findConflicts(
	wanted: string[],
	manifestEntry: string[] | undefined,
): Promise<string[]> {
	if (!existsSync(AGENTS_DIR)) return [];

	const entries = await readdir(AGENTS_DIR);
	const existingFiles = new Set(
		entries.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")),
	);
	const managedSet = new Set(manifestEntry ?? []);

	return wanted.filter((name) => existingFiles.has(name) && !managedSet.has(name));
}

// ── Sync / Cleanup ─────────────────────────────────────────────────

/**
 * Write a profile's subagents as .md files for pi-subagents discovery.
 *
 * 1. Removes previously managed files for this profile (from manifest)
 * 2. Checks for conflicts with user-owned files
 * 3. Writes new .md files
 * 4. Updates manifest
 *
 * Returns list of conflicting agent names, or empty array on success.
 */
export async function syncSubagents(profile: Profile): Promise<string[]> {
	const manifest = await readManifest();
	const prevEntry = manifest[profile.name] ?? [];

	// Step 1: Remove previous files for this profile
	for (const agentName of prevEntry) {
		const filePath = join(AGENTS_DIR, `${agentName}.md`);
		try {
			await unlink(filePath);
		} catch {
			/* already gone */
		}
	}

	// Step 2: If no subagents defined, just update manifest and return
	if (!profile.subagents || Object.keys(profile.subagents).length === 0) {
		delete manifest[profile.name];
		await writeManifest(manifest);
		return [];
	}

	// Step 3: Check conflicts (files not in manifest that we want to write)
	const wanted = Object.keys(profile.subagents);
	const conflicts = await findConflicts(wanted, prevEntry);
	if (conflicts.length > 0) {
		return conflicts; // caller decides whether to proceed
	}

	// Step 4: Write new agent files
	await mkdir(AGENTS_DIR, { recursive: true });
	const written: string[] = [];
	for (const [agentName, config] of Object.entries(profile.subagents)) {
		if (config.enabled === false) continue; // skip disabled agents
		const content = generateAgentMd(agentName, config);
		await writeFile(join(AGENTS_DIR, `${agentName}.md`), content, "utf-8");
		written.push(agentName);
	}

	// Step 5: Update manifest
	manifest[profile.name] = written;
	await writeManifest(manifest);
	return [];
}

/**
 * Remove a profile's managed subagent files from disk and manifest.
 */
export async function removeSubagents(profileName: string): Promise<void> {
	const manifest = await readManifest();
	const entry = manifest[profileName];
	if (!entry) return;

	for (const agentName of entry) {
		const filePath = join(AGENTS_DIR, `${agentName}.md`);
		try {
			await unlink(filePath);
		} catch {
			/* already gone */
		}
	}
	delete manifest[profileName];
	await writeManifest(manifest);
}

/**
 * Clean up all profile-managed subagent files.
 * Used on session start when no profile is active, or for stale profiles
 * whose .json was deleted while pi was offline.
 */
export async function cleanupAllManaged(): Promise<void> {
	const manifest = await readManifest();
	if (Object.keys(manifest).length === 0) return;

	// Collect all agent names from manifest
	const allEntries = new Set(Object.values(manifest).flat());

	// Delete all managed .md files
	for (const agentName of allEntries) {
		const filePath = join(AGENTS_DIR, `${agentName}.md`);
		try {
			await unlink(filePath);
		} catch {
			/* already gone */
		}
	}

	// Remove entries for profiles whose .json no longer exists
	const profilesDir = PROFILES_DIR;
	let entries: string[];
	try {
		entries = await readdir(profilesDir);
	} catch {
		await writeManifest({});
		return;
	}
	const existingProfiles = new Set(
		entries.filter((f) => f.endsWith(".json") && f !== ".active")
			.map((f) => f.replace(/\.json$/, "")),
	);
	for (const key of Object.keys(manifest)) {
		if (!existingProfiles.has(key)) delete manifest[key];
	}

	await writeManifest(manifest);
}

/**
 * Build a human-readable list of available subagents for system prompt injection.
 */
export function formatSubagentList(profile: Profile): string {
	const subs = profile.subagents;
	if (!subs || Object.keys(subs).length === 0) return "";

	const lines: string[] = [];
	lines.push(`\n## Available Subagents`);
	for (const [name, config] of Object.entries(subs)) {
		if (config.enabled === false) continue;
		const modelInfo = config.model
			? `${config.model.provider ?? ""}/${config.model.model ?? ""}`
			: "default model";
		const desc = config.description ?? "No description";
		lines.push(`• ${name} — ${desc} (${modelInfo})`);
	}
	lines.push(
		`\nUse via: Agent({ subagent_type: "<name>", prompt: "..." })`,
	);
	lines.push(`or natural language like "用 <name> 做..."`);
	return lines.join("\n");
}
