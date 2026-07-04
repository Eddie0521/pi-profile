# pi-profile

[![npm version](https://img.shields.io/npm/v/pi-profile)](https://www.npmjs.com/package/pi-profile)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Ready-to-use Pi profiles — switch between personas with `--profile` or `/profile`.

Includes:

| Profile | Label | Description |
|---------|-------|-------------|
| `default` | ⚡ Default | 通用编程助手模式 (deepseek-v4-flash) |
| `researcher` | 🔬 Deep Researcher | 深度研究模式，专注 web 搜索与信息综合 (kimi-k2.6) |

## Install

```bash
pi install npm:pi-profile
```

Once installed and pi is reloaded, the profiles are automatically copied to `~/.pi/profiles/`.

## Usage

Start pi with a specific profile:

```bash
pi --profile researcher
```

Switch profiles inside pi:

```
/profile researcher
/profile default
```

List available profiles:

```bash
ls ~/.pi/profiles/
```

## Profiles

### ⚡ Default (`default`)

General-purpose coding assistant using `opencode-go/deepseek-v4-flash`.

### 🔬 Deep Researcher (`researcher`)

Research-oriented profile that enforces source citation, cross-validation, and structured output. Uses `opencode-go/kimi-k2.6` with high thinking level. Automatically loads `learn`, `wiki-read`, and `wiki-write` skills.

## Development

```bash
# Link locally for testing
cd pi-profile
npm link

# Test with local path
pi install ./pi-profile

# Publish
npm publish
```

## License

MIT
