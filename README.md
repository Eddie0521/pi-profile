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
  <em>Ready-to-use Pi profiles — switch between coding and research personas with a single command.</em>
</p>

---

Pi profiles bundle your agent's system prompt, model binding, skills, and tool configuration into a single switchable persona. This package gives you two fully-configured profiles that work out of the box with <a href="https://pi.dev">Pi</a>.

## 📦 Profiles

| Profile | Label | Model | Use Case |
|---------|-------|-------|----------|
| `default` | ⚡ Default | `deepseek-v4-flash` | General-purpose coding assistant |
| `researcher` | 🔬 Deep Researcher | `kimi-k2.6` | Web research & information synthesis |

### ⚡ Default

The everyday coding profile. Quick, capable, and ready for anything — from debugging a cryptic error to scaffolding a new module.

```json
{
  "model": {
    "provider": "opencode-go",
    "model": "deepseek-v4-flash"
  }
}
```

### 🔬 Deep Researcher

A rigorous research assistant profile. It enforces source citation, cross-validation, and structured output — ideal for literature surveys, technical deep-dives, and investigative tasks.

- **System prompt**: strict research guidelines (cite sources, cross-check, structured output)
- **Skills**: `learn`, `wiki-read`, `wiki-write` — auto-loaded for efficient knowledge work
- **Model**: `kimi-k2.6` with `high` thinking level
- **Session**: auto-named `🔬 Research`

## 🚀 Install

```bash
pi install npm:pi-profile
```

Once installed, Pi loads the package's extension which automatically deploys the profiles to `~/.pi/profiles/`. You'll see a confirmation message on the next Pi startup.

## 🎮 Usage

### Start with a profile from the command line

```bash
pi --profile researcher
pi --profile default
```

### Switch profiles during a session

```
/profile researcher
/profile default
```

### List available profiles

```bash
ls ~/.pi/profiles/
```

### Create your own profiles

Profiles are just JSON files. Create a new one:

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

See the [profile schema](https://github.com/acumen7/pi-profile) for all available options.

## 📋 Profile schema

Each profile is a JSON file at `~/.pi/profiles/<name>.json`. Here's the full schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Profile identifier (lowercase, no spaces) |
| `label` | `string` | | Display label (emojis OK) |
| `description` | `string` | | One-line summary |
| `systemPrompt` | `string` | | System prompt override (role, tone, behavior) |
| `model` | `object` | | Fixed model binding |
| `model.provider` | `string` | | e.g. `anthropic`, `google`, `opencode-go` |
| `model.model` | `string` | | e.g. `claude-sonnet-4-7`, `gpt-5` |
| `model.thinkingLevel` | `string` | | `off`, `low`, `medium`, `high`, `xhigh` |
| `tools` | `object` | | Tool access control |
| `tools.whitelist` | `string[]` | | If set, ONLY these tools are available |
| `tools.blacklist` | `string[]` | | Tools to explicitly disallow |
| `skills` | `string[]` | | Skills auto-bound to this profile |
| `permissions` | `object` | | Dangerous command & path protection |
| `subagents` | `object` | | Team members (each with own model & tools) |
| `sessionName` | `string` | | Auto-name for sessions |

### Subagents (team profiles)

Profiles can define specialized sub-agents — each with its own model, tools, and system prompt. This enables patterns like:

- **Planner** (strong model, read-only) → **Executor** (light model, full access)
- **Researcher** (web tools) → **Writer** (no web, prose-focused)
- **Orchestrator** delegates to any combination

Example:

```json
{
  "name": "dev-team",
  "label": "👨‍💻 Dev Team",
  "subagents": {
    "planner": {
      "description": "Architecture & design",
      "model": { "provider": "anthropic", "model": "claude-sonnet-4-7" },
      "tools": { "whitelist": ["read", "grep", "find", "ls"] },
      "systemPrompt": "Output detailed implementation plans."
    },
    "executor": {
      "description": "Implementation",
      "model": { "provider": "opencode-go", "model": "deepseek-v4-flash" },
      "systemPrompt": "Implement strictly according to the plan."
    }
  }
}
```

## 🧩 How it works

This package ships a lightweight Pi extension (`extensions/index.ts`) that, on `session_start`, copies the bundled profiles into `~/.pi/profiles/`. No manual file moves, no symlinks — just install and go.

```
pi install npm:pi-profile
  → pi downloads & loads the package
    → extension fires on session_start
      → profiles/ directory contents copied to ~/.pi/profiles/
        → ready for --profile or /profile
```

The profiles are then managed entirely by Pi's native profile system — no lock-in, no magic. You can edit, delete, or add new profiles as plain JSON files anytime.

## 🔧 Development

```bash
# Clone
git clone https://github.com/acumen7/pi-profile.git
cd pi-profile

# Test locally
pi install ./pi-profile

# Install from local path
pi install ./pi-profile

# Publish (requires npm login)
npm publish
```

### Testing

```bash
# Validate package
npm pack --dry-run

# Test profiles
pi --profile default -p "What profile am I using?"
pi --profile researcher -p "What profile am I using?"
```

## 📄 License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">
  Made for the <a href="https://pi.dev">Pi ecosystem</a>. Profiles are just JSON — share them, fork them, make them your own.
</p>
