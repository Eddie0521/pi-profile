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
  <em>开箱即用的 Pi 配置文件。一条命令，任意角色。</em>
</p>

---

## 为什么需要配置？

想象两个 Agent 并排站着。左边是位严肃的后端工程师：克制、精准，没写测试不动一行代码，提交信息里带着 `Reviewed-by`，连 `rm -rf` 都自己拦下来。右边是位活泼的社媒运营：句句带 emoji，开头必有钩子，写推特的劲头像欠了算法房租。

底层是同一个模型，干的活天差地别。

一个 Pi 会话不该同时演这两个角色。配置文件就是把系统提示词、模型绑定、技能和工具权限打包成一个可切换的角色：工程师写一份，运营写一份，任务切换时换人。安全审计的只读审核员、断网写作模式、规划者+执行者的开发团队：每个都是一份 JSON。

本包内置两个配置先跑起来（一个通用编程助手，一个研究模式），让安装完就能看见东西。但真正值得做的是写自己的。

## ✨ 亮点

- **一个 Agent，多种 Profile。** 不用再在 Claude Code、Codex、Pi 之间来回跳着找那个“今天该用哪个”的状态。Pi 配置文件就在同一个 CLI 里，换角色不换工具。
- **Skill/Tools 隔离。** 审查配置看不到 `web_search`，写作配置看不到 `bash`。一个配置不需要某个工具，它就不存在。LLM 不会把上下文和注意力浪费在不该伸手的能力上。
- **预设提示词和模型，一键启用。** 系统提示词、模型绑定、思考等级、会话名：在 JSON 里定义一次，切换时一气启用。
- **Subagent 随 Profile 走。** Profile 不只是“一个人”，是一支团队。每个角色有独立的模型、工具和提示词，配置切换时一起带上。

## 🚀 快速开始

```bash
# 安装
pi install npm:pi-profile

# 启动时指定配置
pi --profile researcher

# 在会话中切换
/profile researcher
/profile default
```

配置会在首次加载时部署到 `~/.pi/profiles/`，下次启动 Pi 时会看到确认提示。

## 📋 命令

```
/profile                          # 当前 + 列表
/profile researcher               # 切换
/profile list                     # 列出所有配置
/profile show researcher          # 打印 JSON
/profile create                   # 打开向导
/profile create ai                # "我要一个 Rust 审查配置"
/profile create manual            # 逐字段填写
/profile rm reviewer              # 删除
```

从命令行启动：

```bash
pi --profile researcher
pi --profile default
```

用环境变量设默认：

```bash
export PI_PROFILE=researcher
pi                                # 总是以 researcher 启动
```

## 🤔 为什么是 Pi？

Pi 跟 profile 是个干净的搭配，这主要因为它底层就是这么搭的。

- **每个环节都可以配置。** 系统提示词、模型、技能、工具、斜杠命令、UI、主题、agent 循环，都能被 profile 改动，不需要去 fork 项目。
- **Provider/Model 是一等公民。** 一个配置跑在 Anthropic，下一个跑在本地模型，再下一个跑在团队这周在评估的某家厂商。不被任何一家束缚。
- **一个 Extension 形状复盖 Tool/Skill/Subagent。** 注册自定义工具、斜杠命令、状态组件、子代理：同一个 `ExtensionAPI`，同一个 `extensions/` 目录。planner+executor+reviewer 这支团队，几百行 TypeScript 就拼完，不用开新项目。
- **不做大杂烩。** Claude Code、Codex 都带了一堆没人要的功能，挂在一个“什么都是”的 agent 上。Pi 起点接近空白，让 profile 按需添加。这才是 profile 存在的意义。

## 📦 内置配置

| 配置 | 名称 | 模型 | 用途 |
|------|------|------|------|
| `default` | ⚡ 默认 | `deepseek-v4-flash` | 通用编程 |
| `researcher` | 🔬 深度研究者 | `kimi-k2.6` | Web 研究与综合 |

## 🧩 字段说明

配置就是普通 JSON，存放在 `~/.pi/profiles/<name>.json`。用任何编辑器都能改。

```bash
ls ~/.pi/profiles/
cat ~/.pi/profiles/researcher.json
```

手写一个新配置：

```bash
cat > ~/.pi/profiles/reviewer.json << 'EOF'
{
  "name": "reviewer",
  "label": "👁️ 代码审查",
  "description": "只读代码审查，专注安全性",
  "systemPrompt": "你是一个高级代码审查员...",
  "tools": {
    "whitelist": ["read", "grep", "find", "ls"]
  }
}
EOF
```

### 完整字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 标识符，小写，无空格 |
| `label` | `string` |  | 显示名称，支持 emoji |
| `description` | `string` |  | 一句话简介 |
| `systemPrompt` | `string` |  | 角色/语气/行为覆盖 |
| `model` | `object` |  | 固定模型绑定 |
| `model.provider` | `string` |  | `anthropic`、`google`、`opencode-go` 等 |
| `model.model` | `string` |  | `claude-sonnet-4-7`、`deepseek-v4-flash` 等 |
| `model.thinkingLevel` | `string` |  | `off`、`low`、`medium`、`high`、`xhigh` |
| `tools` | `object` |  | 工具权限控制 |
| `tools.whitelist` | `string[]` |  | 如果设置，则仅允许这些工具 |
| `tools.blacklist` | `string[]` |  | 明确禁止的工具 |
| `skills` | `string[]` |  | 技能白名单；未列出的对模型不可见 |
| `permissions` | `object` |  | 命令与路径护栏 |
| `permissions.dangerousCommands` | `string[]` |  | 阻止的 bash 模式，如 `rm -rf /` |
| `permissions.protectedPaths` | `string[]` |  | 阻止读写的路径 |
| `subagents` | `object` |  | 团队成员，各自拥有独立模型/工具 |
| `sessionName` | `string` |  | 会话自动命名 |

### 子代理

一个配置可以自带团队。每个子代理有自己的模型、工具和系统提示词，并会作为 Pi agent 暴露出来供你委托任务。

常见的几种结构：

- **规划者 → 执行者**：强模型只读规划，轻模型负责写
- **研究员 → 写手**：具备网络能力的调研，输入到专注写作的环节
- **编排者**：主代理把子任务分给不同的专业角色

两人开发团队示例：

```json
{
  "name": "dev-team",
  "label": "👨‍💻 开发团队",
  "subagents": {
    "planner": {
      "description": "架构规划与方案设计",
      "model": { "provider": "anthropic", "model": "claude-sonnet-4-7" },
      "tools": { "whitelist": ["read", "grep", "find", "ls"] },
      "systemPrompt": "输出详细的实现方案，逐文件拆解。"
    },
    "executor": {
      "description": "按规划实现代码",
      "model": { "provider": "opencode-go", "model": "deepseek-v4-flash" },
      "systemPrompt": "严格按照规划实现，不要重新设计。"
    }
  }
}
```

每个子代理会落在 `~/.pi/agent/agents/<name>.md`，通过 `Agent({ subagent_type: "planner", prompt: "..." })` 委托任务。

## 🔧 工作原理

包里带了一个轻量扩展（`extensions/index.ts`），在 `session_start` 时把内置配置拷贝到 `~/.pi/profiles/`。没有符号链接，没有手动步骤。

```
pi install npm:pi-profile
  → pi 加载包
    → 扩展在 session_start 触发
      → profiles/ 拷贝到 ~/.pi/profiles/
        → --profile 与 /profile 即可用
```

之后配置文件就归 Pi 的原生 profile 系统管了。任何时候都可以用编辑器查看、修改、删除。

## 🛠 开发

```bash
git clone https://github.com/Eddie0521/pi-profile.git
cd pi-profile

# 本地测试
pi install ./pi-profile

# 验证包结构
npm pack --dry-run

# 发布
npm login
npm publish
```

## 📄 许可证

MIT。详见 [LICENSE](./LICENSE)。

---

<p align="center">
  为 <a href="https://pi.dev">Pi 生态</a> 而作。配置只是 JSON：分享、Fork、改造，都是你的。
</p>
