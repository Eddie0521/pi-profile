<p align="right">
  English | <a href="./README_CN.md">简体中文</a> · <a href="https://pi.dev/packages/pi-profile">pi.dev</a>
</p>

<h1 align="center">pi-profile</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-profile"><img src="https://img.shields.io/npm/v/pi-profile?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://pi.dev/packages/pi-profile"><img src="https://img.shields.io/badge/pi.dev-package-6366f1?style=flat-square" alt="pi.dev package" /></a>
  <a href="https://github.com/acumen7/pi-profile"><img src="https://img.shields.io/github/last-commit/acumen7/pi-profile?style=flat-square" alt="GitHub last commit" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <em>Ready-to-use Pi profiles — switch to any role with a single command.</em>
</p>

---

## Why different profiles?

You wouldn't bring the same mindset to every task. Debugging a production outage needs sharp focus and full tool access. Reviewing a pull request calls for restraint — read-only, no accidental writes. Surveying the latest papers demands web search, source citation, and structured note-taking, not a code editor.

Pi profiles solve this by bundling system prompt, model binding, skills, and tool configuration into a single switchable persona. Instead of manually tweaking settings each time you context-switch, you define a profile once and flip between them with a single command.

This package ships two ready-to-use profiles to get you started — a general-purpose coding assistant and a rigorous research mode. But the real power is that you can create your own: a read-only reviewer for security audits, a writing mode with no internet access, a full dev team with planner + executor sub-agents. Whatever your workflow demands.

## 🚀 QuickStart

```bash
# Install
pi install npm:pi-profile

# Start Pi with a profile
pi --profile researcher

# Switch profiles on the fly (inside Pi)
/profile researcher
/profile default
```

That's it. The profiles are auto-deployed to `~/.pi/profiles/` on first load. You'll see a confirmation on next Pi startup.

## 📋 Profile commands

Once installed, Pi gains the following slash commands:

| Command | Description |
|---------|-------------|
| `/profile` | Show current profile + list all available |
| `/profile <name>` | Switch to a profile (e.g. `/profile researcher`) |
| `/profile list` | List all available profiles |
| `/profile show <name>` | Display a profile's full JSON configuration |
| `/profile create` | Create a new profile (interactive menu) |
| `/profile create ai` | AI-guided — describe your intent, I'll generate it |
| `/profile create manual` | Step-by-step wizard covering all options |
| `/profile rm <name>` | Delete a profile |

**Examples:**

```
/profile                          # see current profile + list
/profile researcher               # switch to researcher
/profile list                     # list all profiles
/profile show researcher          # view full JSON config
/profile create                   # start the creation wizard
/profile create ai                # "I want a Rust code review profile"
/profile create manual            # walk through each field one by one
/profile rm reviewer              # delete a profile
```

You can also start Pi with a specific profile from the command line:

```bash
pi --profile researcher
pi --profile default
```

And set a persistent default via environment variable:

```bash
export PI_PROFILE=researcher
pi                              # starts with researcher automatically
```

## 📦 Included profiles

| Profile | Label | Model | Best for |
|---------|-------|-------|----------|
| `default` | ⚡ Default | `deepseek-v4-flash` | General-purpose coding |
| `researcher` | 🔬 Deep Researcher | `kimi-k2.6` | Web research & synthesis |

### ⚡ Default

The everyday coding profile. Quick, capable, and ready for anything — debugging a cryptic error, scaffolding a new module, or refactoring legacy code.

```json
{
  "model": {
    "provider": "opencode-go",
    "model": "deepseek-v4-flash"
  }
}
```

### 🔬 Deep Researcher

A rigorous research assistant. Enforces source citation, cross-validation, and structured output — ideal for literature surveys, technical deep-dives, and investigative tasks.

- **System prompt**: strict research guidelines (cite sources, cross-check, structured output)
- **Skills**: `learn`, `wiki-read`, `wiki-write` auto-loaded for efficient knowledge work
- **Model**: `kimi-k2.6` with `high` thinking level
- **Session name**: auto-set to `🔬 Research`

## 🧩 Profile schema

Profiles live as plain JSON files at `~/.pi/profiles/<name>.json`. You can inspect, create, or edit them with any text editor.

```bash
# List all profiles
ls ~/.pi/profiles/

# View a profile
cat ~/.pi/profiles/researcher.json

# Create a new one by hand
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

### Full field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Profile identifier (lowercase, no spaces) |
| `label` | `string` | | Display label (emojis OK) |
| `description` | `string` | | One-line summary |
| `systemPrompt` | `string` | | System prompt override (role, tone, behavior) |
| `model` | `object` | | Fixed model binding |
| `model.provider` | `string` | | e.g. `anthropic`, `google`, `opencode-go` |
| `model.model` | `string` | | e.g. `claude-sonnet-4-7`, `deepseek-v4-flash` |
| `model.thinkingLevel` | `string` | | `off`, `low`, `medium`, `high`, `xhigh` |
| `tools` | `object` | | Tool access control |
| `tools.whitelist` | `string[]` | | If set, ONLY these tools are available |
| `tools.blacklist` | `string[]` | | Tools to explicitly disallow |
| `skills` | `string[]` | | Skills auto-bound to this profile; non-selected skills become invisible to the model |
| `permissions` | `object` | | Dangerous command & path protection |
| `permissions.dangerousCommands` | `string[]` | | Bash patterns to block (e.g. `rm -rf /`) |
| `permissions.protectedPaths` | `string[]` | | File paths to block in read/write/edit |
| `subagents` | `object` | | Team members (each with own model, tools, prompt) |
| `sessionName` | `string` | | Auto-name for sessions using this profile |

### Team profiles with subagents

Profiles can define specialized sub-agents — each with its own model, tools, and system prompt — letting you build multi-agent workflows within a single profile. Common patterns:

- **Planner → Executor**: a strong model plans (read-only), then a light model executes
- **Researcher → Writer**: web-capable research feeds into a focused writing pass
- **Orchestrator**: the main agent delegates sub-tasks to specialized helpers

Example — a two-person dev team:

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

Each subagent is exposed as a Pi agent via `~/.pi/agent/agents/<name>.md`, so you can delegate with `Agent({ subagent_type: "planner", prompt: "..." })`.

## 🔧 How it works

This package ships a small Pi extension (`extensions/index.ts`) that, on `session_start`, copies the bundled profiles into `~/.pi/profiles/`. No manual file moves, no symlinks — just install and go.

```
pi install npm:pi-profile
  → Pi downloads & loads the package
    → extension fires on session_start
      → profiles/ directory copied to ~/.pi/profiles/
        → ready for --profile or /profile
```

After installation, profiles are managed entirely by Pi's native profile system — no lock-in, no magic. You can inspect, edit, or delete profile JSONs at any time.

## 🛠 Development

```bash
git clone https://github.com/acumen7/pi-profile.git
cd pi-profile

# Test locally
pi install ./pi-profile

# Validate package
npm pack --dry-run

# Publish (requires npm login)
npm publish
```

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">
  Made for the <a href="https://pi.dev">Pi ecosystem</a>. Profiles are just JSON — share them, fork them, make them your own.
</p>
