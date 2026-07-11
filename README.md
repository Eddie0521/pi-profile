<p align="right">
  <a href="README_CN.md">🇨🇳 中文</a>
</p>

# pi-profile

A pi extension for **instant identity switching** — swap model, skills,
subagents, and system prompt in the same session, no restart needed.

```bash
/profile researcher          # switch to the researcher identity
/profile default             # back to default
pi --profile researcher      # start directly in a profile
```

## Install

```bash
pi install npm:pi-profile
```

Example profiles (`default`, `researcher`) ship in the repo's [`profiles/`](profiles/)
directory — copy them to `~/.pi/profiles/` to start, or build your own with
`/profile create`.

## Quick start

```bash
# Use the researcher profile (ships as example)
pi --profile researcher

# Inside an interactive session
/profile researcher

# List all profiles
/profile list
```

## How it works

pi-profile hooks into pi's extension API to switch **runtime identity**:

| Layer | Mechanism | Effect |
|-------|-----------|--------|
| **Skills** | `before_agent_start` + `tool_call` | 3-layer hard block: skills outside profile are invisible to the LLM |
| **Subagents** | Agent `.md` file sync | Profile-defined team members available for delegation |
| **Prompt** | `before_agent_start` | Profile's system prompt injected each turn (append mode) |
| **Model** | `pi.setModel()` | Different profiles use different models |
| **Autocomplete** | `addAutocompleteProvider` | `/` only shows profile's skills and templates |

> **Identity, not security.** Profile controls *who the AI is* — not what tools
> it can use or what commands are dangerous. Tool access and security policies
> are handled by dedicated extensions like `pi-permission-suite`.

## Profile files

Stored as `~/.pi/profiles/<name>.json`:

```json
{
  "name": "researcher",
  "label": "🔬 Deep Researcher",
  "description": "Deep research mode with web search focus",

  "systemPrompt": "你是一个严谨的研究助手。\n\n## 准则\n1. 每次回答必须附上来源链接\n2. 优先使用 web_search 验证事实\n3. 交叉验证多个来源后再得出结论\n4. 用结构化格式输出（列表、表格、摘要）\n5. 遇到不确定的，明确说明",

  "model": {
    "provider": "opencode-go",
    "model": "kimi-k2.6",
    "thinkingLevel": "high"
  },

  "skills": ["learn", "wiki-read", "wiki-write"],

  "sessionName": "🔬 Research"
}
```

### Profile interface

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique ID (lowercase, no spaces) |
| `label` | `string?` | Display label (emojis OK) |
| `description` | `string?` | One-line summary shown in profile list |
| `systemPrompt` | `string?` | Appended to Pi's default system prompt each turn |
| `model` | `{provider, model, thinkingLevel?}` | Optional fixed model binding |
| `skills` | `string[]?` | Skills visible to LLM (undefined = all skills visible) |
| `prompts` | `string[]?` | Prompt templates visible in autocomplete |
| `subagents` | `Record<string, Subagent>` | Team members synced to Pi's agent system |
| `sessionName` | `string?` | Auto-session label when using this profile |

### Skill hard blocking (3 layers)

When `skills` is set, non-listed skills are **completely invisible** to the LLM:

| Layer | What | How |
|-------|------|-----|
| 1 | System prompt | `<available_skills>` XML filtered — LLM never sees them listed |
| 2 | Read interception | LLM calling `read()` on a non-profile SKILL.md is blocked |
| 3 | Autocomplete | `/skill:<name>` doesn't appear in auto-complete |

This means the LLM cannot know about, discover, or use skills outside the
profile's scope. Skills still load at startup — profile controls *visibility*,
not *availability*.

## Commands

| Command | Description |
|---------|-------------|
| `/profile` | Show current profile + available list |
| `/profile <name>` | Switch profile |
| `/profile list` | List all profiles |
| `/profile show <name>` | Show profile JSON |
| `/profile create` | Interactive wizard (AI-guided or manual) |
| `/profile rm <name>` | Delete profile |

## CLI

```bash
pi --profile <name>       # Start with profile
PI_PROFILE=<name> pi      # Via environment variable
```
