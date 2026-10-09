# FreeStatus 项目交接文档

> 给接手的新会话或新开发者。先读本页，再按需读 `docs/design.md`、`docs/protocol.md`、`docs/roadmap.md`。

## 1. 项目概览

FreeStatus（自由状态栏）是一个 SillyTavern 第三方扩展。字段由模板声明，AI 在回复尾部输出一个 ` ```fs ` JSON 有值快照，扩展解析后存入聊天、在右侧卡片侧栏渲染、可选回注给 AI。内置一套通用模板；题材专用模板由用户在设置面板自建或导入，随实例保存，不随仓库分发；用户可在本地 `local-templates/`（已 gitignore）存放私有模板文件，用设置面板「导入 JSON」恢复，该目录不入库。

- 仓库：`git@github.com:huabuyu233/FreeStatus.git`，分支 `master`
- 当前版本：v1.3.7；提交历史见第 11 节，近期工作记录见第 12 节
- 部署实例：本地开发实例 `127.0.0.1:8000`；用户云酒馆 `silly.huabuyu.fun:57731`
- 扩展形态：`manifest.json` + `index.js`（ES module），无构建步骤，运行时零依赖

## 2. 当前状态

已验证：

- 32 个单测通过（`pnpm vitest run`），ESLint 干净（`pnpm eslint .`）
- 本地 ST 与云酒馆均能加载扩展，侧栏与设置面板挂载成功
- 端到端解析渲染已人工验证（云酒馆实测：AI 在回复末尾输出 ` ```fs ` 块后，侧栏出现角色卡片，各字段渲染正确，用户确认）
- 修复了云酒馆「找不到 settings.html」：模板路径不再写死目录名，改用 `import.meta.url`
- 修复了 AI 不知道协议的问题：v1.0.1 起 interceptor 每轮自动注入协议规则与当前状态（旧版只在已有状态时注入，鸡生蛋问题）

尚未实测（下一步重点）：

- v1.3.0 动效系统浏览器实测：6 个 fx 动画渲染、值变化闪光反馈、动效总开关、reduced-motion 兼容（需云端更新扩展后强刷）
- v1.2.0 有值快照链路的浏览器实测：空值字段隐藏、卡片底部「显示空字段」开关、手改值自动锁定
- v1.2.1 侧栏视觉改动的实测：默认收起、小球展开动画、透明面板（需云端更新扩展后强刷）
- 群聊多角色（代码按消息 `name` 与 `_char` 分角色，未跑过）
- 随卡存储（`writeExtensionField` 写角色卡、从卡载入）
- 设置面板布局复看（按钮换行、字段行输入框宽度已改 CSS，未复看效果）

## 3. 目录结构与职责

```
FreeStatus/
├── manifest.json         扩展清单：display_name / js / css / generate_interceptor / version
├── index.js              入口：初始化、事件挂钩、interceptor 全局函数、宏注册、设置面板挂载
├── settings.html         设置面板静态骨架（无模板变量，纯静态 HTML）
├── style.css             侧栏卡片与设置面板样式（含移动端）
├── src/
│   ├── parser.js         纯函数：```fs 解析、类型推断、值钳制、合并（可单测）
│   ├── templates.js      内置通用模板、默认设置、协议提示词与稀疏示例生成
│   ├── state.js          存储读写：设置 / 每聊状态 / 角色卡
│   ├── prompt.js         紧凑状态串生成（用于回注与宏，跳过空值字段）
│   ├── ui.js             侧栏卡片渲染、空值隐藏、显示空字段开关、点值即改、手改自动锁定、隐藏原始块
│   └── settings.js       设置面板逻辑：模板选择/编辑、字段表、导入导出、协议复制、诊断
├── tests/parser.test.js  解析器单测（parse/coerce/mergeState）
├── tests/templates.test.js  协议提示词与默认设置单测
├── eslint.config.js      ESLint 扁平配置（含浏览器全局声明）
├── docs/                 设计、协议、范围、本交接文档
├── local-templates/      用户本地私有模板（gitignore，不入库）
└── package.json          pnpm 开发工具链（eslint / prettier / vitest）
```

## 4. 数据模型与存储键

全局设置 `extensionSettings.freestatus`：

```
{
  enabled: true,
  sidebarOpen: false,                      // 侧栏默认收起，点 FS 小球展开（v1.2.1 改默认值，已存设置不受影响）
  hideBlocks: true,                        // 隐藏消息里的原始 ```fs 块
  injection: 'interceptor' | 'macro' | 'off',
  injectProtocol: true,                    // 自动注入协议规则开关
  showEmptyFields: false,                  // 卡片底部「显示空字段」开关（展开无值字段行手动赋值）
  collapsedSections: [],                   // 设置面板分节折叠记忆
  templates: [Template],
  activeTemplateId: 'default',
  ignoredKeys: []                          // 用户选择忽略的未知键
}
```

每聊状态 `chatMetadata.freestatus`：

```
{
  templateId: 'default',                   // 该聊使用的模板，缺省回落到 activeTemplateId
  chars: { [角色名]: { values: {}, locks: {}, updated: 0 } },
  collapsed: { [角色名]: true },
  ignoredKeys: []
}
```

角色卡镜像 `writeExtensionField(characterId, 'freestatus', { templates, activeTemplateId, chars })`，写入路径 `data.extensions.freestatus`。

Template 结构：

```
{ id, name, version, fields: [
  { key, label, kind, min, max, color, default, inject, locked, note, sample }
] }
```

`kind` 取值：`bar`（数值条）/ `chip`（短语）/ `text`（长文本）/ `tag`（键值字典）/ `list`（字符串数组）/ `check`（布尔）。`note` 会进协议提示词（全部 6 种 kind 均支持，chip/text/check 的 note 替代默认描述）；`sample` 用于生成稀疏示例。

## 5. AI 协议摘要

- AI 在回复最末尾输出一个 ` ```fs ` 代码块，内容是单个 JSON 对象，有值快照：只输出当前有值的键，省略即清空（`mergeState` 替换语义，未出现的键从状态移除，锁定字段从上一轮保留）。
- 状态栏只渲染 values 里存在的字段；无值字段默认隐藏，卡片底部「显示空字段」开关可展开补值；手动改过的字段自动锁定（点 🔒 解锁后交还 AI 控制）。
- 协议提示词含字段清单、稀疏示例（每种 kind 取一个字段）、规则 1「只输出有值字段」、规则 2「有值字段必须续传」。
- `_` 前缀键是元数据，`_char` 表示状态归属角色，不渲染。
- 解析器取最后一个块，`JSON.parse` 失败即丢弃本次、沿用旧值。
- 完整规范、可粘贴的世界书条目、隐藏正则、失败 FAQ 见 `docs/protocol.md`。
- 协议提示词由设置面板「复制协议提示词」按当前模板生成，用户无需手写。

## 6. 已核实的 SillyTavern API（基于本地 ST 源码，勿重复调研）

本地 ST 源码在 `D:\Users\huabu\project\sillytavern`。以下签名均已核对：

- 扩展 JS 以 `<script type="module">` 加载：`public/scripts/extensions.js:826`
- `generate_interceptor`（manifest 字段）指向全局函数，调用为 `await globalThis[name](chat, contextSize, abort, type)`，`chat` 是 coreChat 消息对象数组，可 push：`public/scripts/extensions.js:2024-2045`、`public/script.js:4564`
- 事件参数：`MESSAGE_RECEIVED(messageId, type)`、`CHARACTER_MESSAGE_RENDERED(messageId, type)`、`MESSAGE_SWIPED(mesId)`、`MESSAGE_EDITED(modifyAt)`、`CHAT_CHANGED(chatId)`、`GENERATION_ENDED`；事件名见 `public/scripts/events.js`
- `SillyTavern.getContext()` 字段：`chat`、`chatMetadata`、`saveMetadata`、`saveMetadataDebounced`、`saveSettingsDebounced`、`extensionSettings`、`eventSource`、`eventTypes`、`name1`、`name2`、`characterId`、`writeExtensionField`、`setExtensionPrompt`、`substituteParams`：`public/scripts/st-context.js:115`
- 宏（新 API）：`import { macros } from '/scripts/macros/macro-system.js'`，`macros.register(name, { description, returns, handler })`；宏名需匹配 `/^[a-zA-Z][\w-_]*$/`（`fs_state` 合法）：`public/scripts/macros/macro-system.js`、`engine/MacroLexer.js:17`。旧 `context.registerMacro` 已弃用，代码里作为兜底
- 模板渲染：`renderExtensionTemplateAsync(extName, templateId)` 解析为 `scripts/extensions/${extName}/${templateId}.html`：`public/scripts/extensions.js:137`。本扩展已改为用 `import.meta.url` 直接 fetch `settings.html`，避免目录名依赖
- `writeExtensionField(characterId, key, value)` 写入 `data.extensions.${key}`，群聊时 `characterId` 可能为 undefined：`public/scripts/extensions.js:2070`
- 设置面板容器：`#extensions_settings` 与 `#extensions_settings2`（`public/index.html:5773`、`:5791`）

## 7. 开发环境与命令

环境已就绪：Node v22.23.2、pnpm 12.4.2、fnm 1.39、git 2.55。Node 版本由 `.node-version` 钉住。

```powershell
# 测试与静态检查
cd D:\Users\huabu\project\FreeStatus
pnpm vitest run
pnpm eslint .
node --check index.js        # 逐个源文件语法检查

# 本地 SillyTavern 实例（已克隆在 D:\Users\huabu\project\sillytavern）
cd D:\Users\huabu\project\sillytavern
npm run start                # http://127.0.0.1:8000

# junction 挂载（免管理员，改完刷新即生效）
New-Item -ItemType Junction `
  -Path 'D:\Users\huabu\project\sillytavern\public\scripts\extensions\third-party\freestatus' `
  -Target 'D:\Users\huabu\project\FreeStatus'
```

## 8. 部署与安装

- 推送到 `FreeStatus/master` 后，云酒馆在「扩展 → 管理扩展程序」更新或重装，仓库 URL 不变，然后 `Ctrl+F5` 强刷。
- 本地实例走 junction，文件改动刷新页面即生效（CSS/JS 改动建议 `Ctrl+F5`）。
- `manifest.json` 的 `auto_update: true` 在云上是真正 git clone，可生效；本地 junction 只是目录挂载，ST 可能打印 GitError，无害。

## 9. 已知问题与坑

- 目录名依赖（已修）：`renderExtensionTemplateAsync` 需要 `third-party/<仓库名>`，仓库名恰好是 `FreeStatus` 而代码曾写死 `freestatus`，导致云端报「找不到 settings.html」。现改用 `new URL('./settings.html', import.meta.url)`，装到任何目录名都可用。
- 默认模板变更（v1.1.0）：内置模板换成通用模板，仓库只带这一套。已保存过设置的实例保留其现有模板；从未保存设置的实例更新后会看到通用模板，旧状态值归入卡片「其他」分组。恢复自定义模板用设置面板的「导入 JSON」。
- 侧栏新默认是收起（v1.2.1），但 `sidebarOpen` 属于已存设置，老实例首次仍按之前保存的值显示，点一次小球即可切换并记住。
- 手改值自动锁定（v1.2.0）：手动编辑会置 🔒，AI 不再更新该字段，需手动解锁交还控制，属设计行为，向用户解释时注意。
- 云上扩展名显示 undefined：云端缓存的旧清单，重装/更新 + 强刷应恢复。若仍为 undefined，需排查云端 ST 版本与清单读取差异。
- 隐藏原始块实现方式：用 DOM 隐藏（`ui.js` 的 `hideStatusBlocks` / `hideAllStatusBlocks`），未接入 ST 正则扩展的自动注册。`docs/protocol.md` 保留了手动正则方案作为备选。
- 浏览器自动化冒烟不可用：Tabbit CLI 注册失效（需重启 Tabbit Browser）；Chrome 未安装，`browser-cdp` 的 CDP 方案也不可用。云端/本地视觉验证目前靠人工。
- Windows 换行：仓库内 LF，Windows 检出为 CRLF，git 会打印 warning，属正常现象。

## 10. 下一步待办

1. 云端更新扩展到 v1.2.1 后人工实测：有值快照（空值隐藏、显示空字段开关、手改自动锁定）+ 侧栏视觉（默认收起、小球展开动画、透明面板）。
2. 群聊多角色实测，确认 `_char` 与消息 `name` 的分派。
3. 随卡存储实测，处理群聊 `characterId` 为 undefined 的边界。
4. 复看设置面板布局（按钮换行、字段行输入框宽度已改 CSS，未复看效果）。
5. 补齐未完成项：ST 正则自动注册、更完整的诊断面板。
6. README 标注 MIT，但仓库尚无 `LICENSE` 文件，需补。

## 11. 提交历史

历史已于 v1.1.0 重写为单个初始提交 `7fb9f06`，此前含旧内置预设的提交已从 master 移除；之后按正常演进：`1ddf906`（文档措辞清理）→ `f28b301`（v1.2.0）→ `ce1462b`（v1.2.1）。版本演进记录：

- v1.0.0 首个版本：模板编辑、解析、卡片侧栏、点值即改、回注双轨
- v1.0.1：interceptor 协议自动注入、解析器围栏误匹配修复、设置面板开关同步与注入预览
- v1.0.2：设置面板分节折叠（小箭头收起/展开，状态记忆）
- v1.1.0：内置模板改为通用模板，题材专用模板改由用户自建/导入；文档与测试同步；仓库历史重写
- v1.2.0：协议改为有值快照（只输出有值字段，省略即清空，mergeState 替换语义）；状态栏隐藏无值字段，卡片底部「显示空字段」开关；手动改值自动锁定；字段 note 全面进协议提示词（chip/text/check 亦生效）；示例 JSON 改为每种 kind 取一个字段的稀疏版
- v1.2.1：侧栏默认收起，点击 FS 小球展开（滑入+淡入动画），小球开启态高亮；面板背景改为全透明、卡片悬浮显示；移动端抽屉同效
- v1.3.0：新增字段动效系统（fx）。22 个内置动画 id（爱心/符印/波浪/湿光/状态图标等），模板字段 `"fx": "id"` 调用，纯渲染层不进协议；氛围粒子常驻 + 值变化闪光反馈；「小动画」总开关默认开；状态图标（milk）按值文本三态自动切换；设置面板新增动效对照表小节；`animations` 设置项；reduced-motion 兼容；测试 24 → 37。
- v1.3.1：图标动效扩展。milk 图标改为带身体轮廓的躯干侧面剪影（孤立剪影不形象）；新增 `uterus` 容器图标动效（23 个 id），tag 值渲染为容器剪影 + 内部液位随值四态变化（空/半满/灌满脉动/溢出滴落，`liquidState()`）；`liquidState` 判定顺序修正（半 > 满）；测试 37 → 41。
- v1.3.2：动效精简。移除 milk / uterus 两个图标型动效（含 SVG 图标渲染、`iconState()`/`liquidState()` 判定及相关 CSS），注册表 23 → 21；预设胸部/体内 fx 改回 `drip`/`wave`；测试 41 → 32。
- v1.3.3：动效再度精简至 6 个。仅保留 `hearts`/`sparkle`/`shiver`/`sway`/`stars`/`wave`，删除其余 15 个（sigil/smoke/hypno/sheen/breathe/zzz/pulse/pop/bubbles/drip/heat/engorge/spray/gloss/flow）及对应 CSS；通用模板与私有预设的 fx 全部改指这 6 个。
- v1.3.4：动效密度随数值变化。`hearts`/`sparkle` 的粒子数量与速度按字段数值比例缩放（bar 值低→一两颗、值高→密集涌现）；`ui.js` 新增 `fieldRatio()`、粒子改为按强度动态生成并内联定位与周期，`fx.js` 新增 `fxIntensity()` 强度配置；测试 32 → 34。
- v1.3.5：数值条上的粒子沿已填充部分分布。bar 上的爱心/星光不再铺满整行，而是分布在数值条的填充区间（低值只在左侧一小段冒，高值铺满整条），强化「动画长在条上」的结构；`injectParticles()` 增 `spread` 参数。
- v1.3.6：字段名前缀动画。字段配了 fx 时，在字段名左侧显示一个随动效变化的标记字形（`fx.js` 注册表加 `glyph` 与 `fxGlyph()`；`ui.js` 在 label 前插 `.fs-fx-marker`），如「♥ 色欲」；数值条上的粒子动画同时保留。测试 34 → 35。
- v1.3.7：前缀密度 + 条上动画限定填充区。爱心/星光的「密集度」改为作用在字段名前缀（`fxPrefix()`，值越高前缀字形越多，如「♥♥♥♥ 色欲」）；数值条的粒子固定数量、只分布在已填充宽度内（填充 50% 就只有左半段有动画），未填充部分无动画。测试 35 → 36。

## 12. 近期工作记录

按时间顺序（版本详情见第 11 节）：

- 文档与代码首版：README / design / protocol / roadmap 四份文档 + 本交接文档；扩展代码（manifest、index.js、src 六模块、settings.html、style.css），22 个单测 + ESLint 打底。
- 云端端到端联调：修 settings.html 路径（`import.meta.url`）、加 interceptor 协议自动注入（解决鸡生蛋问题），用户实测 AI 输出状态块 → 侧栏卡片渲染成功。
- 题材模板出库（v1.1.0）：内置模板只留通用模板，README/文档/测试同步改为通用叙事，仓库历史重写为单个干净提交。
- 文档措辞清理：删除 roadmap/README/design/handoff 里交付节奏类的元注释；行文规范固化（中文、不用破折号叙述腔、不用「不是…而是…」句式、不用流程元注释，提交信息保持中性）。
- 有值快照改造（v1.2.0）：协议从「全量快照、一个都不能少」改为「只输出有值字段、省略即清空」；`mergeState` 改替换语义（锁定字段跨快照保留）；状态栏只渲染有值字段，卡头摘要取第一个有值的 chip/bar；卡片底部「显示空字段 (N)」开关（`showEmptyFields`）；手动改值自动锁定；字段 `note` 进全部 6 种 kind 的协议行；协议示例 JSON 稀疏化（每种 kind 取一个字段）；回注状态串跳过空值；测试 22 → 24；五份文档同步。
- 侧栏视觉重构（v1.2.1）：默认收起，点 FS 小球滑入 + 淡入展开（transform/opacity/visibility 过渡，收起后隐藏交互），小球开启态红底高亮、悬停放大、带阴影；面板去不透明背景与边框，卡片悬浮正文；移动端底部抽屉同效。
- 用户本地私有模板迭代：私有模板文件维护在 `local-templates/`（gitignore），当前版本 28 字段、覆盖全部 6 种 kind；恢复方式为设置面板「导入 JSON」→ 选中模板。该目录内容不入库、不在仓库文档出现。
- 动效系统（v1.3.0）：调研 Larson/ST-StatusTracking 等参照项目后落地。新建 `src/fx.js`（22 id 注册表 + `iconState()` 三态判定 + `particleStep()` 粒子配置）；`ui.js` 挂载 `fs-fx-*` 类与粒子层、实现 milk 状态图标渲染、加 `fs-changed` 值变化反馈（模块级快照对比）；`style.css` 追加 22 组动画（含 wave/pop 对 tag 类型的兼容、收起暂停、reduced-motion）；`settings.js/html` 加 fx 下拉、动效总开关、动效对照表（从注册表动态生成）；`templates.js` 加 `animations: true` 默认值；私有预设 28 字段全配 fx；`tests/fx.test.js` 新增 13 个测试（37 总）；design.md 新增第 9 节动效系统对照表；README 加特性一句话。
- 图标迭代（v1.3.1）：用户反馈孤立胸部剪影不形象，milk 图标改为带身体轮廓的躯干侧面剪影（肩颈→背线→腰胯 + 胸前弧线 + 凸起）；用户要求体内字段图标化，新增 `uterus` 容器图标（注册表 23 个 id）：容器剪影 + 顶部弯管示意，内部液位矩形随值四态变化（空/半满/灌满+充盈脉动/溢出+底部滴落，`liquidState()` 按值文本判定，半>满顺序）；私有预设 `inside` 字段 fx wave→uterus；预览页 `local-templates/preview.html` 同步双图标并加 uterus 四态演示区（file:// 双击可开，CSS 引真实 style.css，fx 列表/SVG 与源码手工同步）。
- 动效精简（v1.3.2）：图标型动效（胸部/容器剪影）效果不理想、工程复杂，按「状态栏只需简单动效」的取向移除 milk/uterus 两个图标 id，仅保留通用 CSS 动效：`src/fx.js` 删 `iconState`/`liquidState` 与两条目、`ui.js` 删图标渲染分支、`style.css` 删图标样式（保留 `fsFxSpray` 关键帧供独立 spray 用）；预设胸部/体内 fx 改回 `drip`/`wave`；测试与文档同步。期间还评估过 Rive 状态机路线（装了 Rust+MinGW 工具链、构建 rive-cli、生成 `milk.riv`），因成本收益不划算放弃，相关临时产物未入库。
- 动效定稿（v1.3.3）：用户要求只保留 6 个动效，据此把 `src/fx.js` 注册表缩到 `hearts`/`sparkle`/`shiver`/`sway`/`stars`/`wave`，删除其余 15 条及 `style.css` 对应动画块（同步清理 `fsFxRipple`/`fsFxSpray` 等仅供已删 id 的关键帧）；通用模板与私有预设 28 字段的 fx 全部改指这 6 个；测试与文档同步。
- 动画密度随数值（v1.3.4）：爱心/星光两类粒子动效的粒子数量与动画速度改为随字段数值比例变化（色欲等 bar 值低时只有一两颗爱心，值高时持续密集涌现）；`ui.js` 加 `fieldRatio()` 计算 0~1 强度、`injectParticles` 按强度动态生成粒子并内联设置位置与周期；`fx.js` 加 `fxIntensity()` 强度范围配置；design.md 与测试同步。同时清理了 Rive 评估期安装的 Rust / MinGW 工具链与临时包。
- 条上动画结构（v1.3.5）：bar 上的粒子分布区间从整行收窄到数值条的已填充部分（`injectParticles` 增 `spread` 参数，bar 传 `fieldRatio`，其余传 1），使动画明确「长在数值条上」。
- 字段名前缀动画（v1.3.6）：按用户要求，字段名左侧也加动画标记（如「♥ 色欲」），同时数值条上保留粒子动画；`fx.js` 每个动效加 `glyph` 并提供 `fxGlyph()`，`ui.js` 在 label 前插入 `.fs-fx-marker`，`style.css` 加各动效的标记动画（脉动/闪烁/抖动/摆动/旋转/起伏）。
- 前缀密度与填充区动画（v1.3.7）：澄清需求后调整——「密集度」移到字段名前缀（`fxPrefix()`，值越高前缀爱心越多）；数值条粒子改为固定数量且只分布在已填充宽度内（`injectParticles` 的 `spread` = 填充比例 + `fixedCount`），填充多少就只在多少区域有动画。
