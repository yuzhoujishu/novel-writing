# novel-writing

> Claude Code 小说写作插件 — 自主批次写作闭环，支持大纲、章节、角色、世界观、节拍表、风格保留修订，配合交叉引用的知识图谱实现全程一致性管理。

---

## 目录

- [安装](#安装)
- [操作指南](#操作指南)
- [快速上手](#快速上手)
- [完整技能参考](#完整技能参考)
- [自主批次写作闭环](#自主批次写作闭环)
- [Hook 系统](#hook-系统)
- [项目结构](#项目结构)
- [Profile 模式](#profile-模式)
- [状态管理](#状态管理)
- [知识图谱](#知识图谱)
- [架构原理](#架构原理)
- [故障排除](#故障排除)

---

## 安装

### 前置要求

- **Claude Code** 已安装并认证
- **Node.js** 16+（用于运行 `scripts/lib/` 下的工具脚本）

### 手动安装

#### 步骤 1：准备插件目录

将插件克隆或复制到本地任意目录。建议放在一个固定位置，避免后续移动：

```bash
# 方式 A：克隆仓库
git clone https://github.com/你的用户名/novel-writing.git D:\DATA\github\novel-writing

# 方式 B：直接将文件夹复制到目标路径
```

> **注意**：插件目录路径中最好不要包含中文或空格，如果路径含空格需要用引号包裹（如 `"D:\我的项目\novel-writing"`）。

#### 步骤 2：找到并编辑 settings.json

Claude Code 的配置文件位于用户主目录：

```
# Windows
C:\Users\<你的用户名>\.claude\settings.json

# macOS / Linux
~/.claude/settings.json
```

**如果文件不存在**，需要手动创建。打开终端执行：

```bash
# Windows PowerShell
New-Item -Path "$env:USERPROFILE\.claude\settings.json" -ItemType File

# macOS / Linux
touch ~/.claude/settings.json
```

**如果文件存在但没有 `plugins` 字段**，用任意文本编辑器打开，添加 `plugins` 节点：

```json
{
  // 保留文件中已有的其他配置...
  "plugins": {
    "novel-writing": {
      "path": "D:\\DATA\\github\\novel-writing"
    }
  }
}
```

> **Windows 路径格式**：在 JSON 中使用反斜杠 `\\` 转义，或使用正斜杠 `/`（更稳定）。例如 `D:/DATA/github/novel-writing`。

#### 步骤 3：重启 Claude Code

关闭当前 Claude Code 窗口，重新启动让插件加载生效。

#### 步骤 4：安装依赖

插件脚本依赖 `uuid` 模块，需要在插件根目录安装：

```bash
cd D:\DATA\github\novel-writing
npm install uuid
```

#### 步骤 5：验证安装

启动 Claude Code 后输入以下命令，确认无报错即为安装成功：

```
/outline
/chapter
/character
/world
/beat
/edit
/auto
```

出现技能描述而非 "unknown command" 即表示插件正常加载。

#### 常见问题

**Q: settings.json 中的 `plugins` 字段不生效？**

确认 JSON 格式正确——缺少逗号、引号不匹配是常见错误。可用在线 JSON 校验工具验证。

**Q: 提示 `Cannot find module 'uuid'`？**

执行步骤 4 的 `npm install uuid`，确保在插件根目录下运行。

**Q: 多工作区如何配置？**

插件支持工作区级别的 `settings.json`。在工作区根目录创建 `settings.json` 并配置 `plugins`，该配置仅在当前工作区生效，覆盖用户级配置。

**Q: 如何确认插件实际加载了哪些 Skill？**

在 Claude Code 中输入 `/` 查看斜杠命令菜单，列出的命令中包含 `outline`、`chapter`、`character` 等即为成功。

### 初始化项目

```bash
# 创建第一个小说项目
node scripts/lib/state-manager.js create "我的小说" --genre=奇幻 --tone=史诗

# 查看所有项目
node scripts/lib/state-manager.js list

# 切换到指定项目
node scripts/lib/state-manager.js load <project-id>
```

---

## 快速上手

### 五步开始写作

**Step 1：构建世界观**

```
/world
→ 定义魔法系统、组织、地点、时间线
```

**Step 2：创建角色档案**

```
/character create [角色名]
→ 填写角色背景、性格弧光、人物关系
```

**Step 3：生成大纲**

```
/outline
→ 输入故事前提、体裁、结构偏好
→ 生成三幕结构章节大纲
```

**Step 4：创建节拍表（可选）**

```
/beat --framework=save-the-cat
→ 场景级节拍分解
```

**Step 5：开始写作**

```
/auto --batch=5
→ 自主批次写作，一次性生成5章
→ 写完后自动更新所有状态文件
```

### 快速 MVP（极简模式）

一条命令即可完成小说写作全流程：

```bash
# 1. 创建项目
node scripts/lib/state-manager.js create "我的小说"

# 2. 加载项目
node scripts/lib/state-manager.js load <project-id>

# 3. 在 Claude Code 中直接执行自动写作
/auto 生成一部仙侠小说 总章数50章
```

**自动完成以下步骤**：
1. 检测 world.json 是否存在 → 不存在则自动创建
2. 检测 characters.json 是否存在 → 不存在则自动创建
3. 检测 outline.json 是否存在 → 不存在则根据参数自动生成大纲
4. 循环执行 `/auto --batch=5` 直至完成目标章节数

**循环写作**（每次生成5章）：
```
/auto --batch=5
→ 自动续写后续章节，无需手动指定
→ 循环直到完成目标
```

**验证进度**：
```
node scripts/lib/state-manager.js meta <project-id>
```

---

## 完整技能参考

### `/outline` — 大纲规划

生成或扩展故事大纲。

- 输入故事前提、体裁、结构偏好（三幕/四幕/英雄之旅）
- 按 Act → Chapter 生成层级结构
- 每章包含：标题、摘要、POV、地理位置、关键事件、字数目标
- 输出到 `data/{project}/outline.json` 和 `chapters/00-outline.md`

### `/chapter` — 章节写作

根据大纲和风格档案撰写单章。

- `--continue` — 续写下一章
- `--num=N` — 写第 N 章
- `--light` — 短章（1500-2500 字）
- `--full` — 长章（4000-6000 字）
- 首次写作自动提取风格档案

### `/character` — 角色管理

创建、编辑、查询角色档案。

- `create [name]` — 创建新角色
- `edit [name]` — 编辑现有角色
- 直接提问模式：`/character 谁知道这个秘密？`
- 支持关系网络、首次出现章节等交叉引用

### `/world` — 世界构建

构建故事世界：魔法系统、地点、组织、时间线。

- `build [type]` — 构建特定组件
- 直接提问模式：`/world 哪个组织控制北方领土？`
- 支持层级地点、派系成员、事件时间线等交叉引用

### `/beat` — 节拍表

场景级叙事结构规划。

- `--framework=three-act|save-the-cat|scenes` — 选择框架
- `--chapter=N` — 针对特定章节
- `--expand` — 扩展已有节拍表
- 自动关联角色和地点的首次出现

### `/edit` — 风格修订

在保留作者风格的前提下修订文稿。

- `--level=light|medium|heavy` — 修订强度
- `--chapter=N` — 指定修订章节
- `--focus=pacing|dialogue|description|consistency|grammar` — 重点领域
- 三级修订：轻度润色 → 质量改进 → 结构调整

---

## 自主批次写作闭环

核心技能 `/auto`，实现无人值守的批次写作。

### 工作流程

```
┌─────────────────────────────────────────────────┐
│  Phase 1: 批次预检                                │
│  ├─ 解析活动项目                                   │
│  ├─ 加载大纲（验证有 outline 状态章节）             │
│  └─ 确定批次范围（最多5章，按顺序）                 │
├─────────────────────────────────────────────────┤
│  Phase 2: 全量上下文加载（一次，仅循环前）           │
│  ├─ meta.json / outline.json                     │
│  ├─ characters.json / world.json                  │
│  ├─ style-profile.json / beats.json（存在时）     │
│  └─ 最近1-2章（连续性回调）                        │
├─────────────────────────────────────────────────┤
│  Phase 3: 顺序章节写作（逐章，串行）                │
│  ├─ pre-chapter-chinese-count 钩子检查            │
│  ├─ 写入 chapters/{N}.md                         │
│  └─ post-chapter-state-update 钩子更新状态        │
├─────────────────────────────────────────────────┤
│  Phase 4: 最终状态同步                            │
│  ├─ 更新 meta.json（activeChapter / wordCount）   │
│  ├─ 更新 outline.json（status → draft）           │
│  ├─ 更新 beats.json（节拍状态）                   │
│  └─ 触发风格档案提取（新 Act 首章）                │
├─────────────────────────────────────────────────┤
│  Phase 5: 批次总结报告                            │
│  └─ 完成章节数、总字数、进度百分比                  │
└─────────────────────────────────────────────────┘
```

### 参数

- `--batch=N` — 章节数量（默认 5，最大 5）
- `--start=N` — 覆盖起始章节号

### 闭环机制

1. **读取固定文档**（大纲、角色、世界）作为输入约束
2. **生成动态内容**（章节正文）
3. **更新动态文档**（outline.json 章节状态、meta.json 字数）
4. **下一批次**自动读取更新后的状态，闭环验证

---

## Hook 系统

关键节点自动检查，无需人工干预。

### 配置（`hooks/hooks.json`）

| 触发时机 | 匹配规则 | Hook 脚本 | 作用 |
|---------|---------|----------|------|
| PreToolUse | `Write\|Edit.*chapters/` | `pre-chapter-chinese-count.js` | 检查正文字数 >= 3000 字 |
| PreToolUse | `Bash.*state-manager` | `pre-batch-verify.js` | 批次前验证大纲完整性 |
| PostToolUse | `Write.*chapters/\d+\.md` | `post-chapter-state-update.js` | 写完章节后更新状态文件 |
| PostToolUse | `Write\|Edit.*\.md` | `post-markdown-format.js` | 格式化 Markdown |
| Stop | `.*` | `stop-state-sync.js` | 会话结束前最终状态同步 |

### 自定义 Hook

在 `hooks/hooks.json` 中添加新条目：

```json
{
  "PreToolUse": [{
    "matcher": "Write.*",
    "hooks": [{
      "type": "command",
      "command": "node scripts/lib/hooks/my-custom-hook.js",
      "timeout": 10
    }]
  }]
}
```

---

## 项目结构

```
novel-writing/
├── .claude-plugin/
│   └── plugin.json          # 插件元数据
├── agents/
│   ├── project-manager.md   # 项目管理器（默认 Agent）
│   ├── creative-consultant.md
│   └── style-keeper.md
├── hooks/
│   └── hooks.json           # Hook 配置
├── scripts/lib/
│   ├── state-manager.js     # 项目 CRUD CLI
│   ├── knowledge-graph.js   # 知识图谱引擎
│   ├── style-profile.js     # 风格档案管理
│   ├── beat-sheet.js        # 节拍表管理
│   ├── auto-batch-state.js  # 批次状态处理
│   └── hooks/
│       ├── pre-chapter-chinese-count.js
│       ├── post-chapter-state-update.js
│       ├── pre-batch-verify.js
│       ├── post-markdown-format.js
│       └── stop-state-sync.js
├── skills/
│   ├── auto/                # 自主批次写作
│   ├── outline/             # 大纲规划
│   ├── chapter/             # 章节写作
│   ├── character/           # 角色档案
│   ├── world/               # 世界构建
│   ├── beat/                # 节拍表
│   └── edit/                # 风格修订
├── settings.json            # Agent 配置
└── README.md
```

### 状态文件（`data/{projectId}/`）

```
data/{projectId}/
├── meta.json          # 项目元数据（名称、体裁、基调、字数）
├── outline.json       # 大纲结构（三幕 + 章节列表）
├── characters.json    # 角色档案（关系网络）
├── world.json         # 世界设定（地点、派系、时间线）
├── beats.json         # 节拍表（场景级规划）
├── style-profile.json  # 风格档案（写作风格特征）
└── chapters/
    ├── 00-outline.md
    ├── 00-beats.md
    ├── 00-world.md
    ├── 00-characters/
    ├── 01.md
    ├── 02.md
    └── ...
```

---

## Profile 模式

### Agent Profile（`agents/`）

| Agent | 职责 |
|-------|------|
| `project-manager` | 全局协调，维护状态一致性（默认） |
| `creative-consultant` | 创意顾问，提供叙事建议 |
| `style-keeper` | 风格守护者，提取和维护风格档案 |

### 切换 Agent

在 `settings.json` 中指定默认 Agent，或在会话中通过提示词切换。

---

## 状态管理

### State Manager CLI

```bash
node scripts/lib/state-manager.js create <name> [--genre=<genre>] [--tone=<tone>]
node scripts/lib/state-manager.js list
node scripts/lib/state-manager.js load <project-id>
node scripts/lib/state-manager.js delete <project-id>
node scripts/lib/state-manager.js active
node scripts/lib/state-manager.js meta <project-id>
```

### 状态写规则

1. **原子写入** — 先写临时文件，再 rename
2. **时间戳更新** — 任何状态变更后更新 `updatedAt`
3. **交叉引用** — 添加角色时同步更新 `world.json` 的派系成员
4. **字数同步** — 章节写完后立即更新 `outline.json` 的 `wordCount`

---

## 知识图谱

`scripts/lib/knowledge-graph.js` 提供跨实体交叉查询：

- **角色出现追踪** — 出现在哪些章节、场景、节拍、时间线事件
- **角色地点查询** — 角色到过哪些地点
- **地点人物查询** — 某地点有哪些角色
- **关系路径查找** — 两角色间的直接或间接关系路径
- **自然语言问答** — `Who is X?`、`Relationship between A and B?` 等

---

## 架构原理

### 状态驱动写作

```
固定文档（不变）          动态文档（随写作更新）
├── outline.json          ├── chapters/01.md
├── characters.json       ├── outline.json (status, wordCount)
└── world.json            └── meta.json (activeChapter, wordCount)
```

### 闭环自验证

每次 `/auto` 批次结束后：
1. 验证 `meta.json.activeChapter` 指向最后章节之后
2. 验证 `outline.json` 所有已写章节状态为 `draft`
3. 报告进度百分比（已完成 / 总章节数）

### Hook 检查点

- **写前检查**：字数门槛达标才允许写入
- **写后同步**：状态文件与磁盘文件实时一致
- **批次验证**：大纲无章节时拒绝启动批次
- **会话结束**：确保所有状态已持久化

---

## 操作指南

### 工作目录说明

插件的 `data/` 目录是**固定的**，始终位于插件安装路径下：

```
C:\Users\<用户名>\.claude\plugins\cache\novel-writing\novel-writing\<版本号>\data\
```

不随用户当前工作目录变化。所有项目（`data/{projectId}/`）都存放在插件自己的目录中。

### 补装 uuid 依赖

插件脚本依赖 `uuid` 模块，首次使用前需安装：

```bash
cd C:\Users\<用户名>\.claude\plugins\cache\novel-writing\novel-writing\<版本号>
npm install uuid
```

安装后验证：`node scripts/lib/state-manager.js active` 正常输出即可。

### 理解插件路径

Claude Code 加载 Skill 时使用的路径前缀 `skills/` 指向 Skill 描述文件目录，不含实际脚本。

实际操作应使用插件实际安装路径：

```
C:\Users\<用户名>\.claude\plugins\cache\novel-writing\novel-writing\<版本号>\scripts\lib\state-manager.js
```

可通过 `~/.claude/plugins/installed_plugins.json` 找到插件实际安装路径。

### 正确创建项目

`state-manager.js` 的 `create` 命令不会自动生成数据文件。完整流程：

```bash
# 1. 创建项目（生成 meta.json 和基础结构）
node scripts/lib/state-manager.js create "我的小说"

# 2. 加载项目
node scripts/lib/state-manager.js load <project-id>

# 3. 手动创建数据文件（create 不自动生成这些）
#    data/{projectId}/outline.json     — 章节大纲
#    data/{projectId}/characters.json  — 角色档案
#    data/{projectId}/world.json      — 世界设定
#    data/{projectId}/chapters/*.md    — 各章节内容
```

直接向 `data/{projectId}/` 目录写入 JSON/Markdown 文件即可。

### 更新状态文件

Claude Code 的 Write 工具要求：写入已有文件前必须先 Read。

```
标准流程：
1. Read  目标文件
2. Edit  目标文件
```

对于 `outline.json`、`meta.json` 等频繁更新的文件，每次修改前先 Read 再 Edit。

---

## 故障排除

**Q: `Error: Cannot find module 'uuid'`？**

在插件根目录下执行 `npm install uuid`，参见上方「补装 uuid 依赖」。

**Q: 多次 `/auto` 都返回 `activeProject: null`？**

`create` 命令不会自动生成大纲和状态文件。需要手动创建 `outline.json`、`characters.json`、`world.json` 等数据文件，参见上方「正确创建项目」。

**Q: 写入状态文件报错 `File has not been read yet`？**

Claude Code 要求写入已有文件前必须先 Read。每次更新 `outline.json`、`meta.json` 等状态文件前，先 Read 目标文件再 Edit。

**Q: 批次写作中途失败？**

```
[ABORT] Chapter 3 failed:字数不足
Retry with: /auto --start=3 --batch=2
```

**Q: `style-profile.json` 不存在？**

首次写作首章后自动提取。手动触发：`/edit` 会提示提取。

**Q: Hook 被阻止写入？**

检查 `scripts/lib/hooks/pre-chapter-chinese-count.js` 的字数阈值配置。

**Q: 状态文件不一致？**

运行 `/auto --batch=0` 或手动检查 `data/{project}/` 下的 JSON 文件。
