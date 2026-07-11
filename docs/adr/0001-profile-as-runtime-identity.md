# ADR 0001: Profile as Runtime Identity

We defined **Profile** as a runtime identity concept parallel to (not subordinate
to) Pi's extension system. A profile controls skills visibility (three-layer
hard block, not just autocomplete filtering), subagent availability, model
binding, system prompt, and session naming — but it does NOT control tool
access, security permissions, or extension loading.

*Status: Accepted (updated 2026-07-04)*

## Context

The pi-profile extension was originally built as a convenience layer: switch tool
whitelists, inject a system prompt, and filter autocomplete. But as usage grew,
Profile felt like more than a config preset — it became a way to reconfigure
Pi's entire personality and capability set. The question was: what should
Profile's boundary be relative to Extensions, Skills, Subagents, Tools, and
Permissions?

## Considered Options

### Option A: Profile-as-Extension-Subset
Treat profile as a configuration layer *within* an extension. Profile JSON would
be an extension concern, not a first-class concept.

**Rejected** because:
- Profile already has lifecycle hooks (`session_start`, `before_agent_start`,
  `tool_call`) that span multiple extension boundaries
- Treating profile as "just another extension feature" understates its role as a
  cross-cutting concern

### Option B: Profile-as-Extensions-Controller
Let profile enable/disable extensions at runtime. `profile.extensions` would
specify which extensions to load.

**Rejected** because:
- Extensions are loaded at process start and cannot be dynamically unloaded
  without a full `/reload`
- Adding dynamic extension loading would require core Pi changes and introduce
  complex state management
- Tool whitelisting achieves the same practical effect

### Option C: Profile-as-Security-Boundary
Let profile control tool whitelists, dangerous commands, and protected paths
in addition to identity.

**Initially accepted, later rejected** — during design review we identified
that identity and security are orthogonal concerns:
- Security policies are about *what the AI can do* (hard constraints)
- Identity is about *who the AI is* (role, capability awareness, behavior)
- Mixing them creates confusion: "if I switch to researcher, does my security
  policy change?"
- Tools/permissions are better handled by a dedicated extension
  (pi-permission-suite) that is always active regardless of profile

### Option D (Chosen): Profile-as-Runtime-Identity
Profile is a parallel concept to extensions and orthogonal to security. Extensions
are the *registration mechanism*; profiles are the *identity selector*; security
is a separate infrastructure layer.

## Decision

### Scope
1. **Profile controls**: model, skills (3-layer hard block), subagents
   (sync/clean .md files), system prompt (append mode), session name.
2. **Profile does NOT control**: tool whitelist/blacklist, dangerous commands,
   protected paths, extension loading — these are infrastructure concerns.

### Skill Hard Blocking (3-layer defense)
Skills outside the profile's `skills` list are **completely invisible** to the
LLM, not merely hidden from autocomplete:

| Layer | Hook | Mechanism | What it stops |
|-------|------|-----------|---------------|
| 1 | `before_agent_start` | Filter `<available_skills>` XML | LLM never sees skill listed |
| 2 | `tool_call` | Block `read` on non-profile SKILL.md paths | LLM can't load skill content even if it knows the path |
| 3 | autocomplete provider | Existing filter in `autocomplete.ts` | User doesn't see `/skill:` in suggestions |

When `profile.skills` is undefined, all skills remain visible (default behavior).

95% effective — the remaining 5% (user manually typing `/skill:<name>`) is
accepted as an explicit user action outside the scope of identity control.

### System Prompt Strategy
- **Append mode**: profile.systemPrompt is appended to the default system prompt.
  This is backward-compatible and simple.
- Users who want full role replacement can write "ignore above instructions" in
  their profile.systemPrompt.
- **No caching**: the operation is <1ms (string manipulation on a few KB).
  Cache complexity (dirty flags, invalidation) is not justified.

### Subagents
- Flat list, synced to `~/.pi/agent/agents/*.md` via manifest-tracked files.
- Cleaned up on profile deactivation.
- No subagent categories or hierarchy.

### Profile Switching
- `before_agent_start` fires every turn; prompt is rebuilt each time (no cache).
- `compact` is **not** triggered on switch. LLM adapts to new system prompt
   without history compaction.

## Consequences

- **Backward compatibility**: Existing profiles with `tools` and `permissions`
  fields will still load (extra fields are ignored by JSON.parse), but these
  fields will have no effect. Migration: move tool/permission configs to
  pi-permission-suite.
- **Skill hiding is sharp**: adding `skills` to a profile makes non-listed
  skills completely invisible. Users must be warned about this.
- **Pi core not modified**: all filtering is within extension hooks.
- **Default profile unchanged**: no restrictions, no filtering, no prompt injection.
- **before_agent_start complexity**: the handler now includes XML parsing logic.
  This is coupled to Pi's internal `<available_skills>` format — a Pi core
  update that changes this format could silently break skill filtering.
- **Future consideration**: if we ever want subagent-to-tool registration (each
  subagent as a callable tool), a new extension API may be needed.

## File Manifest

Changes compared to original design:

| File | Change |
|------|--------|
| `profile-loader.ts` | Remove `ProfileTools`, `ProfilePermissions` types; simplify `Profile` interface |
| `index.ts` | Remove `setActiveTools()`, remove `tool_call` permission hooks, simplify `applyProfile()`, add XML filtering in `before_agent_start` |
| `autocomplete.ts` | Keep existing (already filters `/skill:` by profile) |
| `permissions.ts` | **Remove** — no longer needed |
| `subagent-sync.ts` | Keep unchanged |
| `CONTEXT.md` | Updated with final domain model |
| `README.md` | Document new scope |
