# pi-profile — Domain Model

## Overview

pi-profile is an identity-switching extension for the Pi coding agent. A **Profile**
represents a runtime identity — a persona that controls who the AI is (role,
behavior, model, capabilities), not what security boundaries it operates within.

Profile is a **pure identity concept** — orthogonal to security policies (handled
by pi-permission-suite), tool access control, and extension management.

## Glossary

### Profile
A named set of configuration that defines Pi's runtime identity. Controls model,
skills, subagents, system prompt, and session naming. Does NOT control tool
access, security permissions, or extension loading. Stored as
`~/.pi/profiles/<name>.json`.

### Default Profile
The built-in `default` profile. No skill filtering, no model binding, no system
prompt injection. Acts as the "full power" baseline — Pi's native behavior
unchanged.

### Identity Switching
The act of changing the active profile at runtime via `/profile <name>` or CLI
`--profile <name>`. This reconfigures model, skills visibility, subagent
availability, and system prompt without restarting the session.

### Skill Hard Blocking
A **three-layer defense** that makes non-profile skills completely invisible to
the LLM. The LLM cannot know about, discover, or use skills outside the
profile's `skills` list. This goes beyond "hiding" — it is an active block at
the system prompt, autocomplete, and tool-call levels.

### Three-Layer Skill Defense

```
Layer 1: System Prompt XML Removal (before_agent_start)
  → <available_skills> block is filtered to only matching skills
  → LLM never sees non-profile skills listed

Layer 2: Read Tool Interception (tool_call hook)
  → LLM calling read() on a non-profile SKILL.md → blocked with reason
  → Even if LLM knows the file path from conversation history

Layer 3: Autocomplete Filtering (autocomplete.ts)
  → /skill:<name> does not appear in auto-complete dropdown
      (existing behavior, kept unchanged)
```

When a profile's `skills` is undefined (not set), all skills remain visible
(identical to default profile behavior).

### Subagent Sync
The bridge between profile-declared subagents and Pi's subagent discovery.
Profile subagents are written as `~/.pi/agent/agents/<name>.md` files on profile
activation and cleaned up on deactivation. A manifest file
(`.subagent-manifest.json`) tracks ownership to prevent conflicts with
user-created agent files.

### Profile Model Binding
An optional fixed model (`provider` + `model` + `thinkingLevel`) that the
profile enforces via `pi.setModel()` when activated.

### Session Name
An auto-applied session label derived from the profile's `sessionName` or
`label` fields, set via `pi.setSessionName()`.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  Pi Core (infrastructure)                                │
│  ├── Extensions    — always loaded, never                │
│  │                   profile-controlled                   │
│  ├── Skills        — all loaded at startup;               │
│  │                   profile hard-blocks visibility       │
│  └── Subagents     — loaded from .md files;              │
│                      profile syncs/cleans them            │
├─────────────────────────────────────────────────────────┤
│  Profile (runtime identity)                               │
│  ├── systemPrompt  → appended to system prompt           │
│  │                   each turn                            │
│  ├── model         → pi.setModel()                       │
│  ├── skills[ ]     → 3-layer hard block                  │
│  │    Layer 1: XML removal (system prompt)                │
│  │    Layer 2: read interception (tool_call)              │
│  │    Layer 3: autocomplete filtering                     │
│  ├── subagents[ ]  → sync/remove agent .md files         │
│  ├── prompts[ ]    → autocomplete filtering              │
│  └── sessionName   → pi.setSessionName()                 │
├─────────────────────────────────────────────────────────┤
│  pi-permission-suite (separate concern)                   │
│  ├── Tool whitelist / blacklist                          │
│  ├── Dangerous command patterns                          │
│  └── Protected paths                                     │
│  — Security is orthogonal to identity —                  │
└─────────────────────────────────────────────────────────┘
```

## Profile Interface

```typescript
interface Profile {
  name: string;                        // Unique ID, lowercase-no-spaces
  label?: string;                      // Display label (emojis OK)
  description?: string;                // One-line summary

  systemPrompt?: string;               // Appended to system prompt each turn

  model?: {                            // Optional model binding
    provider: string;                  // e.g. "anthropic", "opencode-go"
    model: string;                     // e.g. "claude-sonnet-4", "kimi-k2.6"
    thinkingLevel?: ThinkingLevel;
  };

  skills?: string[];                   // LLM-visible skills (undefined = all)
  prompts?: string[];                  // Autocomplete-visible prompt templates

  subagents?: Record<string, ProfileSubagent>;  // Team members

  sessionName?: string;                // Auto session label
}
```

NOT on Profile (handled elsewhere):
- `tools` — tool access control → pi-permission-suite or Pi settings
- `permissions` — dangerous commands, protected paths → pi-permission-suite

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Profile vs Extension | Parallel concepts | Extension = registration mechanism, Profile = runtime identity |
| Extensions control | Not needed | All extensions always loaded; orthogonal to identity |
| Skill hiding | **3-layer hard block** | LLM cannot know about, discover, or load non-profile skills |
| Tool/permission control | **Not profile's job** | Security is orthogonal to identity; handled by dedicated extension |
| System prompt | Append mode | Simple, backward-compatible |
| before_agent_start | Incremental filtering | Parse + modify `<available_skills>` block, then append |
| before_agent_start cache | **Not needed** | Operation is <1ms; cache complexity not justified |
| Subagent granularity | Flat list | Current model sufficient |
| /profile command | Keep existing | No need for /soul alias |
| Switch-then-compact | **Not needed** | LLM adapts to new system prompt without history compaction |

## Related Files

- `~/.pi/profiles/<name>.json` — Profile definitions (no tools/permissions fields)
- `~/.pi/profiles/.active` — Persisted active profile name
- `~/.pi/profiles/.subagent-manifest.json` — Subagent ownership tracking
- `~/.pi/agent/agents/<name>.md` — Subagent agent files (profile-managed)
