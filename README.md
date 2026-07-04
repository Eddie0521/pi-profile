<p align="right">
  English | <a href="./README_CN.md">简体中文</a> · <a href="https://pi.dev/packages/pi-profile">pi.dev</a>
</p>

<h1 align="center">Pi-Profile</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-profile"><img src="https://img.shields.io/npm/v/pi-profile?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://pi.dev/packages/pi-profile"><img src="https://img.shields.io/badge/pi.dev-package-6366f1?style=flat-square" alt="pi.dev package" /></a>
  <a href="https://github.com/Eddie0521/pi-profile"><img src="https://img.shields.io/github/last-commit/Eddie0521/pi-profile?style=flat-square" alt="GitHub last commit" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <em>Ready-to-use Pi profiles. One command, any role.</em>
</p>

---

## Why profiles?

Picture two agents side by side. On the left, a sober backend engineer: dry, precise, won't touch a line of code without a test, signs commits with `Reviewed-by`, blocks its own `rm -rf`. On the right, a sprightly social media manager: emoji in every reply, hooks in every sentence, writes tweets like it owes the algorithm rent.

Same underlying model. Wildly different jobs.

A Pi session shouldn't try to be both at once. Profiles bundle the system prompt, model binding, skills, and tool permissions into one switchable persona. Define the engineer once, define the manager once, flip between them as your task shifts. A read-only reviewer for security audits, a writing mode with the network cut off, a planner+executor dev team: each is one JSON file.

This package ships two profiles to start with (a general-purpose coding assistant and a research mode) so the install has something to show for itself. The real win is making your own.

## ✨ Highlights

- **One agent, many profiles.** No more bouncing between Claude Code, Codex, and Pi trying to find the right mindset for the task. Pi profiles live in the same CLI; you switch the persona, the tool stays.
- **Skill and tool isolation.** The reviewer profile doesn't see `web_search`. The writer profile doesn't see `bash`. A profile that doesn't need a tool simply doesn't have it, so the LLM doesn't waste tokens or attention on capabilities it shouldn't be reaching for.
- **Preset prompt and model, one keystroke away.** System prompt, model binding, thinking level, session name: all set once in JSON, applied the moment you switch.
- **Subagents ship with the profile.** A profile isn't just a persona, it's a team. Each role on the team gets its own model, tools, and prompt, and the profile brings them along.

## 🚀 QuickStart

```bash
# Install
pi install npm:pi-profile

# Start with a profile
pi --profile researcher

# Switch inside an active session
/profile researcher
/profile default
```

Profiles deploy to `~/.pi/profiles/` on first load. You'll see a confirmation on the next Pi startup.

## 📋 Commands

```
/profile                          # current + list
/profile researcher               # switch
/profile list                     # list all profiles
/profile show researcher          # dump JSON
/profile create                   # open wizard
/profile create ai                # "I want a Rust review profile"
/profile create manual            # walk through fields
/profile rm reviewer              # delete
```

Start from the CLI:

```bash
pi --profile researcher
pi --profile default
```

Or set a default via env var:

```bash
export PI_PROFILE=researcher
pi                                # always opens with researcher
```

## 🤔 Why Pi?

Pi is a clean fit for profiles, and that's mostly because of how the rest of the system is built.

- **Every layer is configurable.** System prompt, model, skills, tools, slash commands, UI, themes, agent loop, all wired up so a profile can change any of them without reaching for a fork.
- **Provider and model are first-class switches.** Run a profile on Anthropic, run the next one on a local model, run a third on whatever the team is benchmarking this week. No lock-in to one vendor.
- **One extension shape covers tools, skills, and subagents.** Register a custom tool, a slash command, a status widget, a sub-agent: same `ExtensionAPI`, same `extensions/` directory. A profile team of planner+executor+reviewer is a few hundred lines of TypeScript, not a new project.
- **No kitchen sink.** Claude Code and Codex ship with a long list of features nobody asked for, attached to a single agent that has to be all of them at once. Pi starts close to empty and lets profiles add exactly what's needed, which is the whole point.

## 📦 What's included

| Profile | Label | Model | Use case |
|---------|-------|-------|----------|
| `default` | ⚡ Default | `deepseek-v4-flash` | General-purpose coding |
| `researcher` | 🔬 Deep Researcher | `kimi-k2.6` | Web research & synthesis |

## 🧩 Schema

Profiles are plain JSON at `~/.pi/profiles/<name>.json`. Edit them with anything.

```bash
ls ~/.pi/profiles/
cat ~/.pi/profiles/researcher.json
```

Hand-rolling a new one:

```bash
cat > ~/.pi/profiles/reviewer.json << 'EOF'
{
  "name": "reviewer",
  "label": "👁️ Code Reviewer",
  "description": "Read-only code review with safety focus",
  "systemPrompt": "You are a senior code reviewer...",
  "tools": {
    "whitelist": ["read", "grep", "find", "ls"]
  }
}
EOF
```

### Field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | `string` | yes | Identifier, lowercase, no spaces |
| `label` | `string` |  | Display label, emojis OK |
| `description` | `string` |  | One-line summary |
| `systemPrompt` | `string` |  | Role / tone / behavior override |
| `model` | `object` |  | Fixed model binding |
| `model.provider` | `string` |  | `anthropic`, `google`, `opencode-go`, ... |
| `model.model` | `string` |  | `claude-sonnet-4-7`, `deepseek-v4-flash`, ... |
| `model.thinkingLevel` | `string` |  | `off`, `low`, `medium`, `high`, `xhigh` |
| `tools` | `object` |  | Tool access control |
| `tools.whitelist` | `string[]` |  | If set, only these tools are available |
| `tools.blacklist` | `string[]` |  | Tools to disallow |
| `skills` | `string[]` |  | Skills visible to the model; others are hidden |
| `permissions` | `object` |  | Bash + path guardrails |
| `permissions.dangerousCommands` | `string[]` |  | Blocked bash patterns, e.g. `rm -rf /` |
| `permissions.protectedPaths` | `string[]` |  | Blocked read/write paths |
| `subagents` | `object` |  | Team members, each with own model/tools |
| `sessionName` | `string` |  | Auto-name for sessions |

### Subagents

A profile can ship its own team. Each subagent has its own model, tools, and system prompt, and gets exposed as a Pi agent you can delegate to.

A few common shapes:

- **Planner → Executor**: a strong model plans read-only, a cheap model writes
- **Researcher → Writer**: web-capable research feeds a focused writing pass
- **Orchestrator**: the main agent routes sub-tasks to specialists

A two-person dev team:

```json
{
  "name": "dev-team",
  "label": "👨‍💻 Dev Team",
  "subagents": {
    "planner": {
      "description": "Architecture & design",
      "model": { "provider": "anthropic", "model": "claude-sonnet-4-7" },
      "tools": { "whitelist": ["read", "grep", "find", "ls"] },
      "systemPrompt": "Output detailed implementation plans with file-by-file breakdowns."
    },
    "executor": {
      "description": "Implementation",
      "model": { "provider": "opencode-go", "model": "deepseek-v4-flash" },
      "systemPrompt": "Implement strictly according to the plan. Do not redesign."
    }
  }
}
```

Each subagent lands at `~/.pi/agent/agents/<name>.md`, so you can delegate with `Agent({ subagent_type: "planner", prompt: "..." })`.

## 🔧 How it works

A small extension (`extensions/index.ts`) ships in the package. On `session_start` it copies the bundled profiles into `~/.pi/profiles/`. No symlinks, no manual steps.

```
pi install npm:pi-profile
  → pi loads the package
    → extension fires on session_start
      → profiles/ copied to ~/.pi/profiles/
        → --profile and /profile work
```

After that, the profiles belong to Pi's native profile system. Edit, delete, add new ones with any text editor.

## 🛠 Development

```bash
git clone https://github.com/Eddie0521/pi-profile.git
cd pi-profile

# Local test
pi install ./pi-profile

# Validate
npm pack --dry-run

# Publish
npm login
npm publish
```

## 📄 License

MIT. See [LICENSE](./LICENSE).

---

<p align="center">
  Made for the <a href="https://pi.dev">Pi ecosystem</a>. Profiles are just JSON: share them, fork them, make them your own.
</p>
