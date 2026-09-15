# Monostich 设计 Spec（汇总）

> 汇总日期：2026-09-15
> 来源：由 `archive/SPEC-2026-08-29.md`、`archive/SPEC-pages-2026-08-29.md`、
> `archive/SPEC-status-2026-08-30.md`、`archive/HERO-SPEC-2026-09-05.md` 四份历史文档浓缩而成。
> 历史原文与原型一并归档在 `archive/`，仅作设计证据留存，**不再作为实现依据**。
>
> **本文件是唯一生效的设计 Spec。** 与代码冲突时以代码为准；改动设计先改本文件。

---

## 1. 设计概念

**「屏幕内外」**：CRT 复古终端是身份符号，不是全局皮肤。

- **屏幕内** = Hero。那台亮着的老显示器（扫描线 / 噪点 / 暗角 / 扫光 / 呼吸 / 色散）只属于首屏。
- **屏幕外** = 其余全站。干净、安静、以阅读为核心的编辑排版；终端感只靠 mono 字体、符号系统（`❯`/`▸`/`←`/`↗`/`[ ]`）、乱码解码、克制的强调色表达。

**双生系统**（现行）：

- **浅色 = 编辑排版（Editorial）**：留白、克制栅格、Fraunces 衬线大标题、`[ ... ]` 命令式链接，几乎无框无卡。蓝色 `--accent: #0066cc`。
- **深色 = 信号控制台（Signal Console）**：JetBrains Mono、磷光琥珀 `--accent: #ffb224`、gutter 行号、`//` 注释式模块头、WebGL 光谱仪首屏。

> 早期 Spec 设想的"橙色主题（`#f97316`）"已被**琥珀 + 蓝色双主题**取代，且改为双主题并重，非"暗色优先、亮色仅保可用"。

---

## 2. 已落地的设计语言

以下是经历史文档确立、且**已在实际代码中落地**的约定，新增页面/组件应遵循：

| 语言 | 说明 | 位置 |
|---|---|---|
| 乱码解码 | 模块标题/年份入视口时字符翻滚定稿，未定稿字符用 `--accent-dim` | `data-scramble`，全局脚本 |
| page-head 统一 | `[← 返回主页]` + `/ eyebrow` + 大标题 + 一句话，样式提取为全局类 | `global.css` `.page-head` / `.back-home` / `.eyebrow` |
| 中文排版 | `.prose-zh`：衬线栈、1.85 行高、两端对齐、中西文自动间距 | `global.css` |
| 列表行 hover | 行底 accent 4% + 标题 `translateX(3px)` 变 accent，包在 `@media (hover:hover)` | 全站列表 |
| 命令式按钮 | `[ ... ]` 方括号，`.btn` / `.btn--primary` | `global.css` |
| 阅读进度条 | 文章页 nav 下沿 2px accent，滚动映射 `scaleX`（非动画） | `ArticleLayout.astro` |
| 代码块语言条 | `data-lang` 由包装脚本写入，`::before` 读取，不新增 DOM | `ArticleLayout.astro` |
| 模块头 | `// NN 名目`，mono、`--text-faint`，`//` 用 `--accent-dim` | `.module-head` |
| h1 字号 | 主题级 token `--font-heading` / `--h1-size-page` / `--h1-size-article` | `global.css` / `dark.css` |

**性格例外（有意为之，勿"统一"掉）**：
- Thinkings 列表 h1 保留斜体。
- About 页是终端本体，允许 mono 浓度最高，用 `whoami` 块 + 硬闪烁光标，**不加** `data-scramble`。

---

## 3. 现行组件地图

深色首页（`index.astro` 条件渲染）：

```
SignalCore(WebGL 光谱仪) → DarkHomeHero → DarkHomeRecent → DarkHomeWork → DarkHomeLab → SiteFooter
```

所有列表模块（Recent / Work / Lab）统一为 **gutter 行号列表**，不再使用卡片网格。
浅色首页 = `Hero` + 随想 section + `Projects` + lab section。

> 注：`DarkHomeOneline.astro` / `DarkHomeTerminal.astro` 已不在渲染树中（随想 bento 已移除）。`dark/SignalCore.astro` 为原生 WebGL2 实现；早期 `lib/pixelscreen/` + `shaders/pixelScreen/` 管线已无引用。

---

## 4. 动效纪律

- 循环动画仅限 Hero（扫描线/呼吸/扫光/光标闪烁）与 SignalCore。
- 新增动效一律 0 个：状态、读数类视觉靠**不动的仪表**表达。
- 全部持续动画在 `prefers-reduced-motion: reduce` 下停止或直显。
- 屏幕外页面**不得**出现扫描线、噪点、暗角、RGB 色散。

---

## 5. 未落地的历史设想（供参考，不构成待办）

以下来自旧 Spec，**从未实现**，保留在此仅为避免重复讨论；若要做需单独立项：

- **StatusBar 状态条**：`OPERATIONAL` + uptime 天数 + 可点组件行（`● core / ● blog / ...`）。
- **deploy log**：内容发布事件时间线（`deploy` / `patch` / `stdout` / `postmortem` + `[ok]` 状态 pill）。
- **90 天 uptime 热力条**：写作活动点线，作"稳定运行"的视觉证据。
- **proc 表**：`pid / name / cmd` 只读进程表替代 lab 列表。
- **绿色/红色语义色**：`--ok`（状态绿）+ `--bad`（告警红），用于状态灯与 pill。当前未引入。
- **NowStrip / 分类 chip**：Hero 后的动态横条 / Recent 行的分类标签。
- **Footer 控制台命令行**：`$ uptime — {n}d` 式可点命令行。

> 上述设想的完整原文见 `archive/SPEC-status-2026-08-30.md`（最详细）与 `archive/SPEC-2026-08-29.md`。

---

## 6. 待确认

1. `design-preview/` 的定位：当前既是归档区又有活文档（本文件）。若后续 Spec 迁到别处（如仓库根 `DESIGN.md`），需同步移动。
2. `lib/pixelscreen/` + `shaders/pixelScreen/` 死代码是否清理（当前零引用）。
