<p align="right">
  <a href="./README.md">English</a> | 简体中文 · <a href="https://pi.dev/packages/pi-profile">pi.dev</a>
</p>

<h1 align="center">pi-profile</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-profile"><img src="https://img.shields.io/npm/v/pi-profile?style=flat-square&label=npm" alt="npm" /></a>
  <a href="https://pi.dev/packages/pi-profile"><img src="https://img.shields.io/badge/pi.dev-package-6366f1?style=flat-square" alt="pi.dev package" /></a>
  <a href="https://github.com/acumen7/pi-profile"><img src="https://img.shields.io/github/last-commit/acumen7/pi-profile?style=flat-square" alt="GitHub last commit" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <em>开箱即用的 Pi 配置文件 — 一条命令切换到任何角色</em>
</p>

---

## 为什么需要不同配置？

你不会用同一种状态去处理所有事情。排查生产故障需要锋利的专注和完整的工具权限；审查代码需要克制——只读，绝不能误写；调研最新论文则需要网络搜索、来源引用和结构化笔记，而不是一个代码编辑器。

Pi 配置文件（profile）正是为此而生：它将系统提示词、模型绑定、技能和工具权限打包为一个可切换的角色。无需每次切换上下文时手动调整设置，定义一次，一条命令就能切换。

本包内置了两个开箱即用的配置——通用编程助手和深度研究者——让你立刻上手。但真正的威力在于你可以创建自己的配置：安全审查的只读审核员、无网络权限的写作模式、包含规划者和执行者的完整开发团队。一切取决于你的工作流需要什么。

## 🚀 快速开始

```bash
# 安装
pi install npm:pi-profile

# 指定配置启动 Pi
pi --profile researcher

# 在 Pi 中即时切换
/profile researcher
/profile default
```

安装后配置文件会自动部署到 `~/.pi/profiles/`，下次启动 Pi 时会看到确认提示。

## 📋 Profile 命令

安装后，Pi 中获得以下斜杠命令：

| 命令 | 说明 |
|------|------|
| `/profile` | 查看当前配置 + 列出所有可用配置 |
| `/profile <name>` | 切换到指定配置（如 `/profile researcher`） |
| `/profile list` | 列出所有可用配置 |
| `/profile show <name>` | 查看指定配置的完整 JSON 内容 |
| `/profile create` | 创建新配置（交互式菜单） |
| `/profile create ai` | AI 引导创建 — 描述你的需求，我帮你生成 |
| `/profile create manual` | 分步骤向导，逐字段设置 |
| `/profile rm <name>` | 删除一个配置 |

**示例：**

```
/profile                          # 查看当前配置 + 列表
/profile researcher               # 切换到 researcher
/profile list                     # 列出所有配置
/profile show researcher          # 查看完整 JSON
/profile create                   # 启动创建向导
/profile create ai                # "我要一个 Rust 代码审查配置"
/profile create manual            # 一步步填写
/profile rm reviewer              # 删除一个配置
```

也可以从命令行直接启动：

```bash
pi --profile researcher
pi --profile default
```

通过环境变量设置默认配置：

```bash
export PI_PROFILE=researcher
pi                              # 自动以 researcher 启动
```

## 📦 内置配置

| 配置 | 名称 | 模型 | 用途 |
|------|------|------|------|
| `default` | ⚡ 默认 | `deepseek-v4-flash` | 通用编程 |
| `researcher` | 🔬 深度研究者 | `kimi-k2.6` | Web 研究与综合 |

### ⚡ 默认

日常编程配置。快速、全能，从调试神秘错误到搭建新模块、重构遗留代码都能应对。

```json
{
  "model": {
    "provider": "opencode-go",
    "model": "deepseek-v4-flash"
  }
}
```

### 🔬 深度研究者

严谨的研究助手。强制要求来源引用、交叉验证和结构化输出——适合文献调研、技术深度分析和调查任务。

- **系统提示词**：严格的研究准则（引用来源、交叉校验、结构化输出）
- **技能**：自动加载 `learn`、`wiki-read`、`wiki-write`
- **模型**：`kimi-k2.6`，`high` 思考等级
- **会话**：自动命名为 `🔬 Research`

## 🧩 配置字段说明

配置文件存放于 `~/.pi/profiles/<name>.json`，可以用任意编辑器查看、创建或修改。

```bash
# 列出所有配置
ls ~/.pi/profiles/

# 查看某个配置
cat ~/.pi/profiles/researcher.json

# 手动创建新配置
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

### 完整字段参考

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 配置标识符（小写、无空格） |
| `label` | `string` | | 显示名称（支持 emoji） |
| `description` | `string` | | 一句话简介 |
| `systemPrompt` | `string` | | 系统提示词覆盖（角色、语气、行为） |
| `model` | `object` | | 固定模型绑定 |
| `model.provider` | `string` | | 例如 `anthropic`、`google`、`opencode-go` |
| `model.model` | `string` | | 例如 `claude-sonnet-4-7`、`deepseek-v4-flash` |
| `model.thinkingLevel` | `string` | | `off`、`low`、`medium`、`high`、`xhigh` |
| `tools` | `object` | | 工具权限控制 |
| `tools.whitelist` | `string[]` | | 如果设置，则*仅*允许这些工具 |
| `tools.blacklist` | `string[]` | | 明确禁止的工具 |
| `skills` | `string[]` | | 自动绑定的技能；未选择的技能对模型完全不可见 |
| `permissions` | `object` | | 危险命令和路径保护 |
| `permissions.dangerousCommands` | `string[]` | | 阻止的 bash 命令模式（如 `rm -rf /`） |
| `permissions.protectedPaths` | `string[]` | | 阻止读写的文件路径 |
| `subagents` | `object` | | 团队成员（各自拥有独立模型、工具和提示词） |
| `sessionName` | `string` | | 会话自动命名 |

### 团队配置（子代理）

配置文件可以定义专门的子代理——每个子代理有自己的模型、工具和系统提示词——让你在一个配置内构建多代理工作流。常见模式：

- **规划者 → 执行者**：强模型做方案（只读），轻模型负责实现
- **研究员 → 写手**：具备网络能力的调研，输入到专注写作的环节
- **编排者**：主代理将子任务委托给专业助手

示例——两人开发团队：

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

每个子代理会暴露为 `~/.pi/agent/agents/<name>.md`，你可以通过 `Agent({ subagent_type: "planner", prompt: "..." })` 委托任务。

## 🔧 工作原理

本包包含一个轻量 Pi 扩展（`extensions/index.ts`），在 `session_start` 时自动将包内配置文件拷贝到 `~/.pi/profiles/`。无需手动移动文件、无需符号链接——安装即用。

```
pi install npm:pi-profile
  → Pi 下载并加载包
    → 扩展在 session_start 时触发
      → profiles/ 目录拷贝到 ~/.pi/profiles/
        → 即可使用 --profile 或 /profile
```

之后配置文件的完全由 Pi 的原生 profile 系统管理——无绑定、无魔法。随时可以查看、编辑或删除。

## 🛠 开发

```bash
git clone https://github.com/acumen7/pi-profile.git
cd pi-profile

# 本地测试
pi install ./pi-profile

# 验证包结构
npm pack --dry-run

# 发布（需要 npm login）
npm publish
```

## 📄 License

MIT — 见 [LICENSE](./LICENSE)。

---

<p align="center">
  为 <a href="https://pi.dev">Pi 生态</a> 而作。配置只是 JSON — 分享它、Fork 它、把它变成你自己的。
</p>
