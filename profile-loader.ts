import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
 import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

// ── Types ──────────────────────────────────────────────────────────

export interface ProfileModel {
	provider?: string;
	model?: string;
	thinkingLevel?: string;
}

/**
 * Configuration for a subagent defined inside a profile.
 * Maps to pi-subagents' agent .md frontmatter fields.
 */
export interface ProfileSubagent {
	systemPrompt?: string;
	description?: string;
	/** Display name shown in agent lists (maps to display_name in .md) */
	displayName?: string;
	/** Model binding */
	model?: ProfileModel;
	/** Tool access rules for the subagent process */
	tools?: {
		whitelist?: string[];
		blacklist?: string[];
	};
	/** Thinking level (maps to thinking in .md frontmatter) */
	thinkingLevel?: string;
	/** Skill names to load */
	skills?: string[];
	/** Extensions to inherit: true=all, false=none, string[]=specific */
	extensions?: boolean | string[];
	/** Extensions to exclude */
	excludeExtensions?: string[];
	/** Tools to explicitly disallow */
	disallowedTools?: string[];
	/** Max agentic turns (0=unlimited) */
	maxTurns?: number;
	/** Persist session across invocations */
	persistSession?: boolean;
	/** Custom session directory */
	sessionDir?: string;
	/** Prompt mode: replace (default) or append */
	promptMode?: "replace" | "append";
	/** Inherit parent conversation context */
	inheritContext?: boolean;
	/** Run in background by default */
	runInBackground?: boolean;
	/** Isolated context (no extension/MCP tools) */
	isolated?: boolean;
	/** Run in isolated git worktree */
	isolation?: "worktree";
	/** Memory scope for agent persistence */
	memory?: "user" | "project" | "local";
	/** Enable/disable this agent */
	enabled?: boolean;
}

export interface Profile {
	name: string;
	label?: string;
	description?: string;
	systemPrompt?: string;
	model?: ProfileModel;
	skills?: string[];
	prompts?: string[];
	subagents?: Record<string, ProfileSubagent>;
	sessionName?: string;
}

// ── Paths ──────────────────────────────────────────────────────────

export const PROFILES_DIR = resolve(homedir(), ".pi", "profiles");
export const ACTIVE_FILE = join(PROFILES_DIR, ".active");

// ── Read / Write ───────────────────────────────────────────────────

export async function ensureProfilesDir(): Promise<void> {
	await mkdir(PROFILES_DIR, { recursive: true });
}

export async function loadProfile(name: string): Promise<Profile | null> {
	try {
		const filePath = join(PROFILES_DIR, `${name}.json`);
		const raw = await readFile(filePath, "utf-8");
		const profile = JSON.parse(raw) as Profile;
		profile.name = name;
		return profile;
	} catch {
		return null;
	}
}

export async function listProfiles(): Promise<Profile[]> {
	try {
		await ensureProfilesDir();
		const entries = await readdir(PROFILES_DIR);
		// Single pass — avoid filter().map() chaining
		const names: string[] = [];
		for (const e of entries) {
			if (e.endsWith(".json") && e !== ".active") {
				names.push(e.replace(/\.json$/, ""));
			}
		}

		const results: Profile[] = [];
		for (const name of names) {
			const p = await loadProfile(name);
			if (p) results.push(p);
		}
		return results;
	} catch {
		return [];
	}
}

export async function getActiveProfileName(): Promise<string> {
	try {
		const raw = await readFile(ACTIVE_FILE, "utf-8");
		const name = raw.trim();
		if (name) return name;
	} catch {
		// file doesn't exist
	}
	return "default";
}

export async function setActiveProfileName(name: string): Promise<void> {
	await ensureProfilesDir();
	await writeFile(ACTIVE_FILE, name, "utf-8");
}

export function activeProfileNameSync(): string {
	try {
		if (existsSync(ACTIVE_FILE)) {
			const raw = readFileSync(ACTIVE_FILE, "utf-8");
			const name = raw.trim();
			if (name) return name;
		}
	} catch {
		// ignore
	}
	return "default";
}

// ── CLI flag / env / saved resolution ──────────────────────────────

export function resolveProfileName(
	flagValue: string | boolean | undefined,
): string {
	// 1. CLI --profile flag
	if (typeof flagValue === "string" && flagValue) return flagValue;
	// 2. Environment variable
	if (typeof process.env.PI_PROFILE === "string" && process.env.PI_PROFILE) {
		return process.env.PI_PROFILE;
	}
	// 3. Saved .active file
	return activeProfileNameSync();
}

