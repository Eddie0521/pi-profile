import type {
	AutocompleteItem,
	AutocompleteProvider,
	AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import type { Profile } from "./profile-loader.ts";

// ── Autocomplete wrapper ───────────────────────────────────────────

/**
 * Wrap the current autocomplete provider to filter `/` commands
 * based on the active profile.
 *
 * Only affects:
 *  - `/skill:<name>`  → filtered by profile.skills
 *  - prompt templates → filtered by profile.prompts
 *
 * Built-in commands (model, settings, etc.) always pass through.
 */
export function createProfileAutocomplete(
	current: AutocompleteProvider,
	getProfile: () => Profile | null,
): AutocompleteProvider {
	return {
		async getSuggestions(
			lines: string[],
			cursorLine: number,
			cursorCol: number,
			options: { signal: AbortSignal },
		): Promise<AutocompleteSuggestions | null> {
			const textBeforeCursor = (lines[cursorLine] ?? "").slice(0, cursorCol);

			// Only intercept lines starting with /
			if (!textBeforeCursor.startsWith("/")) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}

			// Get original suggestions from pi's built-in autocomplete
			const original = await current.getSuggestions(
				lines,
				cursorLine,
				cursorCol,
				options,
			);
			if (!original) return null;

			const profile = getProfile();
			// Default profile means no filtering
			if (!profile || profile.name === "default") return original;

			const allowedSkills = new Set(profile.skills ?? []);
			const allowedPrompts = new Set(profile.prompts ?? []);

			return {
				...original,
				items: original.items.filter((item) =>
					isItemAllowedForProfile(item as AutocompleteItem, profile, allowedSkills, allowedPrompts)
				),
			};
		},

		shouldTriggerFileCompletion(
			lines: string[],
			cursorLine: number,
			cursorCol: number,
		): boolean {
			return (
				current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ??
				true
			);
		},

		applyCompletion: current.applyCompletion.bind(current),
	};
}


/**
 * Check whether an autocomplete item should be visible in the current profile.
 */
function isItemAllowedForProfile(
	item: AutocompleteItem,
	profile: Profile,
	allowedSkills: Set<string>,
	allowedPrompts: Set<string>,
): boolean {
	const value = item.value ?? "";

	// skill:<name> or /skill:<name> → check if skill is in profile
	if (value.startsWith("/skill:")) {
		const skillName = value.slice(7);
		return allowedSkills.has(skillName);
	}
	if (value.startsWith("skill:")) {
		const skillName = value.slice(6);
		return allowedSkills.has(skillName);
	}

	// For other / commands: check built-in allowlist, then prompts filter
	if (value.startsWith("/") && !value.startsWith("/skill:")) {
		const cmdName = value.slice(1);
		const alwaysAllowed: string[] = [
			"profile", "model", "settings", "new", "resume",
			"session", "tree", "fork", "clone", "export", "import",
			"compact", "copy", "share", "reload", "quit",
			"hotkeys", "changelog", "trust", "login", "logout",
			"name", "scoped-models",
		];
		if (alwaysAllowed.includes(cmdName)) return true;
		if (allowedPrompts.size > 0) return allowedPrompts.has(cmdName);
	}

	return true;
}

 
