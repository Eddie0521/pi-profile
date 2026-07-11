<p align="right">
  <a href="./README.md">English</a> | 简体中文 · <a href="https://pi.dev/packages/pi-profile">pi.dev</a>
</p>

<h1 align="center">Pi-Profile</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-profile"><img src="https://img.shields.io/npm/v/pi-profile?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://pi.dev/packages/pi-profile"><img src="https://img.shields.io/badge/pi.dev-package-6366f1?style=flat-square" alt="pi.dev package" /></a>
  <a href="https://github.com/Eddie0521/pi-profile"><img src="https://img.shields.io/github/last-commit/Eddie0521/pi-profile?style=flat-square" alt="GitHub last commit" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <em>运行时身份切换——同一会话内换模型、技能、子代理和系统提示，无需重启。</em>
</p>

---

## 为什么需要 Profile？

想象两个 Agent 并排站着。左边是位严肃的后端工程师：克制、精准，没写测试不动一行代码。右边是位深度研究员：每个结论都要交叉验证，回答必附来源链接。

底层是同一个模型，干的活天差地别。

一个 Pi 会话不该同时演这两个角色。Profile 把系统提示词、模型绑定、技能可见性、子代理团队打包成一个可切换的身份：工程师写一份，研究员写一份，任务切换时换人——不用重启，不用换工具。

> **身份，而非安全。** Profile 控制的是 *AI 是谁*——不是它能用什么工具、哪些命令危险。工具访问和安全策略由专门的扩展（如 [`pi-permission-suite`](https://github.com/Eddie0521/pi-permission-suite)）负责。

## 安装

```bash
pi install npm:pi-profile
```

示例 profile（`default`、`researcher`）在仓库的 [`profiles/`](profiles/) 目录里——复制到 `~/.pi/profiles/` 即可使用，或用 `/profile create` 新建自己的。

## 快速开始

```bash
# 以指定 profile 启动
pi --profile researcher

# 会话内切换
/profile researcher
/profile default

# 列出全部 profile
/profile list
```

## 工作原理

pi-profile 通过 pi 的扩展 API 切换**运行时身份**：

| 层 | 机制 | 效果 |
|----|------|------|
| **技能** | `before_agent_start` + `tool_call` | 三层硬阻断：profile 之外的技能对 LLM 完全不可见 |
| **子代理** | Agent `.md` 文件同步 | profile 定义的团队成员可被委派 |
| **提示词** | `before_agent_start` | profile 的系统提示每轮注入（追加模式） |
| **模型** | `pi.setModel()` | 不同 profile 绑定不同模型 |
| **自动补全** | `addAutocompleteProvider` | `/` 只显示 profile 内的技能和模板 |

## Profile 文件

存放在 `~/.pi/profiles/<name>.json`：

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

### Profile 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 唯一 ID（小写、无空格） |
| `label` | `string?` | 显示标签（可用 emoji） |
| `description` | `string?` | profile 列表里的一行简介 |
| `systemPrompt` | `string?` | 每轮追加到 Pi 默认系统提示之后 |
| `model` | `{provider, model, thinkingLevel?}` | 可选的固定模型绑定 |
| `skills` | `string[]?` | LLM 可见的技能（不设置 = 全部可见） |
| `prompts` | `string[]?` | 自动补全里可见的提示模板 |
| `subagents` | `Record<string, Subagent>` | 同步到 Pi agent 系统的团队成员 |
| `sessionName` | `string?` | 使用该 profile 时的自动会话名 |

### 技能硬阻断（三层）

设置了 `skills` 后，未列出的技能对 LLM **完全不可见**：

| 层 | 内容 | 方式 |
|----|------|------|
| 1 | 系统提示 | 过滤 `<available_skills>` XML——LLM 根本看不到列表里有它们 |
| 2 | 读取拦截 | LLM 对非 profile SKILL.md 调用 `read()` 会被阻断 |
| 3 | 自动补全 | `/skill:<name>` 不出现在补全列表 |

LLM 无法得知、发现或使用 profile 范围之外的技能。技能在启动时仍会加载——profile 控制的是*可见性*，不是*可用性*。

## 命令

| 命令 | 说明 |
|------|------|
| `/profile` | 显示当前 profile 和可用列表 |
| `/profile <name>` | 切换 profile |
| `/profile list` | 列出全部 profile |
| `/profile show <name>` | 显示 profile JSON |
| `/profile create` | 交互式创建向导（AI 引导或手动） |
| `/profile rm <name>` | 删除 profile |

## CLI

```bash
pi --profile <name>       # 以指定 profile 启动
PI_PROFILE=<name> pi      # 通过环境变量
```

## 许可

MIT
