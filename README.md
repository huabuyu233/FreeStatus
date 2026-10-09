# FreeStatus · 自由状态栏

模板驱动的 SillyTavern 人物状态栏扩展。字段由模板声明：模板里写哪些键，AI 就输出哪些键，侧栏就渲染哪些项。换一套模板等于换一套字段，不同故事各自定义自己的状态栏，同一个插件全覆盖。

轻量：不发独立 LLM 请求，状态块约 30–60 token。侧栏以卡片呈现，点值即改，状态可回注给 AI 保持剧情一致。

## 特性

- 模板决定协议。字段声明（key、显示名、类型、上限、颜色）写在模板里，AI 输出什么、提示词写什么、侧栏渲染什么全由模板决定，增删字段即时生效。
- 字段类型有 6 种：数值条 bar（0–100 或自定义上限）、短语 chip、长文本 text、键值字典 tag、条目列表 list、布尔徽章 check。类型决定渲染样式和值校验。
- 字段动效。6 个内置动画 id（爱心、星光、震颤、摇摆、星环、波浪），字段配置 `"fx": "id"` 即调用，纯渲染层不进协议，可开关。
- AI 在回复尾部输出一个 ```fs 代码块，内含 JSON 键值对的有值快照（只输出有值字段，省略即清空），一次解析没有歧义。状态栏只显示有值的项，AI 判断无值的字段不占行。模板外的未知键照样渲染（按值类型推断），可一键收编进模板或忽略。
- 侧栏内每个被追踪角色一张角色名卡片：卡头显示角色名与状态摘要，点击展开或折叠，展开区按模板逐项渲染，折叠状态按聊天记忆。
- 点击任意值直接编辑；无值字段可从卡片底部「显示空字段」开关展开补值。手动改过的字段自动锁定，锁定后 AI 的更新被忽略，解锁后恢复 AI 控制。
- 回注有两条路：generate_interceptor 自动注入协议规则与当前状态（可开关），或 {{fs_state}} 宏自行控制注入位置。回注关闭时插件只做显示。
- 模板可导入导出 JSON，也可写入角色卡扩展字段随卡迁移。
- 状态块截断丢弃本次、解析失败静默沿用旧值、数值钳制到上下限，状态块残缺不会打断对话。

## 各家插件的做法与取舍

| 参照插件 | 吸收的思想 | FreeStatus 的取法 |
|---|---|---|
| [WTracker](https://github.com/bmen25124/SillyTavern-WTracker) / [zTracker](https://github.com/Zaakh/SillyTavern-zTracker) | 用户直接编辑字段定义，字段名完全开放，按声明渲染 | 保留模板编辑器（增删改字段、类型、上限），砍掉独立 LLM 请求与 connection profile 切换 |
| [BetterSimTracker](https://github.com/ghostd93/BetterSimTracker) | 自定义统计分类型（数值/文本/枚举/布尔……），按类型渲染与钳制 | 缩到 6 种 kind，字段声明带默认值、上限、颜色、锁定 |
| [status-card-hud](https://github.com/GoldStarAlexis/status-card-hud) | 紧凑标签客户端渲染，样式不进上下文，约省 80–90% token | AI 主回复尾部 ```fs 全量快照（30–60 token），渲染全在客户端 |
| 酒馆助手 / [ST-StatusTracking](https://github.com/lilminzyu/ST-StatusTracking) | 模板粘贴，配置随角色卡导入导出 | 模板可导入导出并随卡迁移；协议提示词由设置面板按模板一键生成 |

市面插件里，WTracker 系功能重，status-card-hud 没有模板管理，不少题材专用插件把字段写死在代码里。FreeStatus 把这些合起来：字段全开放、零独立请求、中文优先、卡片式移动端 UI，任何题材的状态栏都用同一套模板机制定义。

## 安装

方式一：扩展安装器（推荐）

SillyTavern → 扩展（拼图图标）→ 安装扩展 → 填入仓库 URL：

```
https://github.com/huabuyu233/FreeStatus
```

方式二：手动安装

将本仓库克隆/复制到 SillyTavern 的第三方扩展目录并重启：

```
SillyTavern/public/scripts/extensions/third-party/FreeStatus/
```

安装后在扩展列表勾选启用 FreeStatus。

## 快速上手

1. 启用扩展后，右上扩展工具栏出现 FreeStatus 图标，点击切换侧栏显示。
2. 打开扩展设置 → 模板：默认已选中内置的「通用状态模板」（好感、信任、心情、状态、印象、随身物品、受伤，覆盖全部 6 种字段类型），可按故事直接改字段、新建模板或导入导出 JSON。
3. 直接生成消息即可。协议规则默认由 generate_interceptor 每轮自动注入，AI 会按协议在回复末尾输出状态块。想省 token 可在设置里关掉「自动注入协议规则」，改为点「复制协议提示词」贴进世界书常量条目（🔵 Always Insert，位置 `@d 0 (system)`）。
4. 生成后侧栏出现角色名卡片，点击展开即可看到各项状态，点击任意值可直接修改。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/design.md](docs/design.md) | 核心设计：模板系统、协议、存储、事件、回注、UI、容错 |
| [docs/protocol.md](docs/protocol.md) | 输出协议与可粘贴提示词（含隐藏正则、回注模板、失败 FAQ） |
| [docs/roadmap.md](docs/roadmap.md) | 功能清单与后续想法 |

## License

MIT
