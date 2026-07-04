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
  <em>开箱即用的 Pi 配置文件 — 一条命令在编程和研究角色间切换。</em>
</p>

---

Pi profile 将系统提示词、模型绑定、技能和工具权限打包为一个可切换的角色。本包提供了两个可直接使用的配置，开箱即用，无需手动编辑 JSON。

## 📦 包含的配置

| 配置 | 名称 | 模型 | 用途 |
|------|------|------|------|
| `default` | ⚡ 默认 | `deepseek-v4-flash` | 通用编程助手 |
| `researcher` | 🔬 深度研究者 | `kimi-k2.6` | Web 研究与信息综合 |

### ⚡ 默认

日常编程配置。快速、全能，从调试神秘错误到搭建新模块都能应对。

```json
{
  "model": {
    "provider": "opencode-go",
    "model": "deepseek-v4-flash"
  }
}
```

### 🔬 深度研究者

严谨的研究助手配置。强制要求来源引用、交叉验证和结构化输出 — 适合文献调研、技术深度分析和调查任务。

- **系统提示词**：严格的研究准则（引用来源、交叉校验、结构化输出）
- **技能**：自动加载 `learn`、`wiki-read`、`wiki-write`，开箱即用
- **模型**：`kimi-k2.6`，`high` 思考等级
- **会话**：自动命名为 `🔬 Research`

## 🚀 安装

```bash
pi install npm:pi-profile
```

安装后，Pi 会加载包内的扩展，自动将配置文件部署到 `~/.pi/profiles/`。下次启动 Pi 时会看到确认提示。

## 🎮 使用

### CLI：启动时指定配置

```bash
pi --profile researcher
pi --profile default
```

### ⌨️ Profile 命令（在 Pi 内使用）

安装后，Pi 中可直接使用以下斜杠命令：

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

### 手动创建配置

配置就是普通的 JSON 文件，你也可以直接编辑：

```bash
# 查看已安装的配置
ls ~/.pi/profiles/

# 查看配置的 JSON 内容
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

## 📋 配置字段说明

配置文件存放于 `~/.pi/profiles/<name>.json`。完整字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 配置标识符（小写、无空格） |
| `label` | `string` | | 显示名称（支持 emoji） |
| `description` | `string` | | 一句话简介 |
| `systemPrompt` | `string` | | 系统提示词覆盖（角色、语气、行为） |
| `model` | `object` | | 固定模型绑定 |
| `model.provider` | `string` | | 例如 `anthropic`、`google`、`opencode-go` |
| `model.model` | `string` | | 例如 `claude-sonnet-4-7`、`gpt-5` |
| `model.thinkingLevel` | `string` | | `off`、`low`、`medium`、`high`、`xhigh` |
| `tools` | `object` | | 工具权限控制 |
| `tools.whitelist` | `string[]` | | 如果设置，则_仅_允许这些工具 |
| `tools.blacklist` | `string[]` | | 明确禁止的工具 |
| `skills` | `string[]` | | 自动绑定的技能 |
| `permissions` | `object` | | 危险命令和路径保护 |
| `subagents` | `object` | | 团队成员（各自拥有独立模型和工具） |
| `sessionName` | `string` | | 会话自动命名 |

### 子代理（团队配置）

Profile 可以定义专门的子代理 — 每个子代理有自己的模型、工具和系统提示词。常用模式：

- **规划者**（强模型、只读）→ **执行者**（轻模型、全权限）
- **研究员**（Web 工具）→ **写手**（无网络、专注写作）
- **编排者** 可委托任意组合

示例：

```json
{
  "name": "dev-team",
  "label": "👨‍💻 开发团队",
  "subagents": {
    "planner": {
      "description": "架构规划与方案设计",
      "model": { "provider": "anthropic", "model": "claude-sonnet-4-7" },
      "tools": { "whitelist": ["read", "grep", "find", "ls"] },
      "systemPrompt": "输出详细的实现方案。"
    },
    "executor": {
      "description": "按规划实现代码",
      "model": { "provider": "opencode-go", "model": "deepseek-v4-flash" },
      "systemPrompt": "严格按照规划实现，不要重新设计。"
    }
  }
}
```

## 🧩 工作原理

本包包含一个轻量 Pi 扩展（`extensions/index.ts`），在 `session_start` 时自动将包内配置文件拷贝到 `~/.pi/profiles/`。无需手动移动文件、无需符号链接 — 安装即用。

```
pi install npm:pi-profile
  → Pi 下载并加载包
    → 扩展在 session_start 时触发
      → profiles/ 目录内容拷贝到 ~/.pi/profiles/
        → 即可使用 --profile 或 /profile
```

配置文件的后续管理完全由 Pi 的原生 profile 系统负责 — 无绑定、无魔法。随时可以编辑、删除或新增配置文件。

## 🔧 开发

```bash
# 克隆
git clone https://github.com/acumen7/pi-profile.git
cd pi-profile

# 本地测试
pi install ./pi-profile

# 发布（需要 npm login）
npm publish
```

### 测试

```bash
# 验证包结构
npm pack --dry-run

# 测试配置文件
pi --profile default -p "我现在用的是哪个配置？"
pi --profile researcher -p "我现在用的是哪个配置？"
```

## 📄 许可证

MIT — 见 [LICENSE](./LICENSE)。

---

<p align="center">
  为 <a href="https://pi.dev">Pi 生态</a> 而作。配置只是 JSON — 分享它、Fork 它、把它变成你自己的。
</p>
