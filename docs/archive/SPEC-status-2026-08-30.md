# 首页「STATUS」重设计 — 设计/实现 Spec

> 版本：v1 定稿方向（2026-08-30）
> 性质：**第二轮迭代**。前置文档是 v3 的 `SPEC.md`（已完成大半：NowStrip / scramble / prose-zh / tokens 均已落地）。
> 范围：首页结构 + 双主题 token + 全局少量语汇。**不动**：Astro 内容管线（PocketBase loader、路由、RSS）、内页（archive/notes/thinkings/about/lab）、Hero 与 LogStream 的整体结构。
> 落地方式：按 §9 分期执行；本文件先设计、后实现，每一期单独验收。

---

## 0. 背景与决策记录

第二轮起因：首屏（日志瀑布 + LED + 闪烁光标）已经是"机器"，但滚动后四个模块（一行 / 目录 / 造物 / 杂物间）是同一种横线列表，节奏均匀、无数据、无层次，文艺感来自衬线大留白 + 引用式排版。

方向：把首页从"文集目录"改造成**一台长期运行服务的 status page**——文章是部署记录，小记是 stdout，项目是 service registry，杂物间是 /proc。不是装饰终端元素，而是信息架构整体换用机器语言。

用户已拍板的三条决策：

| 决策点 | 结论 |
|---|---|
| 浅色主题 | 保留，但**去米色纸面**，改灰白（冷灰、类 tty 打印输出） |
| 状态色 | **引入绿色**作为机器语义色（另配告警红），琥珀保留为人文/强调色 |
| 「一行」 | 接受改造为 stdout 格式（`[stdout]` 前缀 + 等宽化） |

配色纪律（全 Spec 最重要的约束）：

```
琥珀  = 人文强调色 —— 标题高亮、链接 hover、光标、LED、scramble 乱码、部署事件
绿色  = 机器状态色 —— ● 灯、[ok]、running、OPERATIONAL
红色  = 告警色     —— [failed]、postmortem 事件、404 日志行（LogStream 已有）
灰色  = 中性和 retired 状态
```

四色各司其职，禁止互串（例：绿灯不用琥珀、链接不用绿色）。功能色永远伴随文字/符号（`●` + `running`、`[ok]`），不单独用颜色传达语义（WCAG color-not-decorative-only）。

---

## 1. 设计概念

**「MONOSTICH STATUS」**：首页 = 一台名为 monostich 的服务的对外状态页。

滚动叙事线（自上而下）：

```
Hero        这台机器的屏幕（现状保留：日志瀑布 + LED + 光标，微调见 §4.1）
StatusBar   全站状态横幅：OPERATIONAL + uptime 天数 + 服务组件行（绿灯）
stdout      原「一行」：机器偶尔吐出的一行人声（文艺感以彩蛋形式保留）
deploy log  原「目录」：内容发布事件时间线（deploy/patch/stdout/postmortem）
uptime      90 天写作活动热力条：「稳定运行」的视觉证据
services    原「造物」：service registry 卡片（● 状态灯 + tags）
proc        原「杂物间」：进程表（pid / name / cmd）
Footer      控制台命令行（$ 前缀命令 + build hash）
```

气质关键词：**冷、密、可信**。文艺不删除，而是降级为机器日志里的彩蛋——stdout 那一条、深夜系统行（LogStream 已有）、幽灵 404（已有）构成全站仅有的三处"人声"，反差比满屏衬线更有力。

与 v3 SPEC 的关系：v3 确立的「屏幕内外」原则**继续有效并加强**——CRT/扫描线仍只属于 Hero 屏幕框内；滚动区是干净的状态台，终端感只靠 mono 字体、状态色、符号系统（`●`/`[ok]`/`❯`/`$`）表达，**不加**扫描线、噪点、辉光、RGB 色散。

---

## 2. Design Tokens

落地到 `src/styles/global.css`。双主题逐行对照（新 token 标 ★，改值标 ▲，其余不变）：

### 2.1 暗色（`:root, :root[data-theme="dark"]`）

```css
--bg:           #0b0d10 ▲   /* 原 #101216，压深近 OLED：机器在暗室里运行 */
--surface:      #11141a ▲   /* 原 #16181d，同步压深 */
--surface-2:    #171b22 ▲   /* 原 #1b1d23 */
--surface-3:    #1f242c ▲   /* 原 #24262e */
--text:         #e6e7ea     /* 不变 */
--text-muted:   #9a9ba2     /* 不变 */
--text-faint:   #71727b     /* 不变 */
--accent:       #ffb224     /* 磷光琥珀，不变 */
--accent-deep:  #eda00e     /* 不变 */
--accent-soft:  rgba(255,178,36,.12)
--accent-dim:   rgba(255,178,36,.55)
--accent-glow:  rgba(255,178,36,.42)
--ok:           #4ade80 ★   /* 状态绿：● 灯、[ok]、running */
--ok-soft:      rgba(74,222,128,.10) ★
--ok-dim:       rgba(74,222,128,.55) ★  /* 次级绿色文字/描边 */
--bad:          #f87171 ★   /* 告警红：[failed]、postmortem */
--bad-soft:     rgba(248,113,113,.10) ★
--nav-bg:       rgba(11,13,16,.82) ▲    /* 跟随 --bg */
--border-subtle:  rgba(230,231,234,.06)  /* 不变 */
--border:         rgba(230,231,234,.10)
--border-strong:  rgba(230,231,234,.18)
--hero-title:   #c9ccd1     /* 不变 */
```

### 2.2 浅色（`:root[data-theme="light"]`）— 灰白化

```css
--bg:           #f2f3f5 ▲   /* 原 #f4f3ee 米色 → 冷灰白 */
--surface:      #ffffff     /* 不变 */
--surface-2:    #e9ebef ▲   /* 原 #f2f0e8 去黄 */
--surface-3:    #dee1e7 ▲   /* 原 #e7e4d8 去黄 */
--text:         #1c1e24 ▲   /* 略冷 */
--text-muted:   #565a63 ▲
--text-faint:   #878b94 ▲
--accent:       #b45309     /* 深琥珀（浅底对比度需要），不变 */
--accent-deep:  #92400e
--accent-soft:  rgba(180,83,9,.10)
--accent-dim:   rgba(180,83,9,.55)
--accent-glow:  rgba(180,83,9,.30)
--ok:           #15803d ★   /* 浅底深绿，对比度 4.5:1+ */
--ok-soft:      rgba(21,128,61,.10) ★
--ok-dim:       rgba(21,128,61,.55) ★
--bad:          #b91c1c ★
--bad-soft:     rgba(185,28,28,.08) ★
--nav-bg:       rgba(242,243,245,.85) ▲
--border-subtle:  rgba(28,30,36,.07) ▲  /* 跟随 text 色相 */
--border:         rgba(28,30,36,.12) ▲
--border-strong:  rgba(28,30,36,.22) ▲
--code-bg:      #e9ebef ▲   /* 去黄 */
--hero-title:   var(--text) /* 不变 */
```

阴影 token（`--shadow-sm/md/lg`）暗色不变；浅色的 rgba 从 `(58,42,24,...)` 暖棕系改为 `(15,23,42,...)` 冷灰系。

### 2.3 对比度验收值（落地后实测核对）

| 配对 | 暗色 | 浅色 | 要求 |
|---|---|---|---|
| `--text` on `--bg` | ≥ 12:1 | ≥ 13:1 | AA 7:1 达标 |
| `--ok` on `--bg` | ≥ 7:1（#4ade80 天然高亮） | ≥ 4.6:1 | AA 4.5:1 |
| `--bad` on `--bg` | ≥ 4.5:1 | ≥ 4.5:1 | 仅大字/符号，配文字兜底 |
| `--accent` on `--bg` | ≥ 7:1 | ≥ 4.5:1 | 现状已达标 |

### 2.4 其他 token 变更

- Nav 主题切换脚本里的 meta `theme-color` 值同步：dark `#101216` → `#0b0d10`，light `#f4f3ee` → `#f2f3f5`（`Nav.astro` 内联脚本 + `BaseLayout.astro` head 各一处）。
- 字体栈、间距、圆角、动效 token 全部不变。`--crt-*` 系列继续只被 Hero 引用。

---

## 3. 数据与组装逻辑（全部 build-time，零运行时依赖）

所有新模块的数据在 `src/pages/index.astro` 的 frontmatter 里组装，PocketBase loader 不动。

### 3.1 事件时间线（deploy log）的 kind 判定

复用现有 `recent` 数组的组装代码，每个条目追加 `kind` 字段：

```ts
type EventKind = "deploy" | "patch" | "stdout" | "postmortem";

// 判定顺序即优先级；label 字段来自 PocketBase（notes/thinkings 已有）
function eventKind(entry): EventKind {
  if (entry.collection === "moments") return "stdout";
  const label = (entry.data.label ?? "").toLowerCase();
  if (/复盘|postmortem|incident/.test(label)) return "postmortem";
  if (entry.data.editedAt && daysBetween(entry.data.date, entry.data.editedAt) >= 7)
    return "patch";
  return "deploy";
}
```

- `postmortem` 触发条件：作者发文时给 label 打上「复盘」或含 postmortem/incident 字样。判定函数同时兼容中英文，正则写在一处常量里。**无匹配则永远不会出现**，属于约定优于配置。
- `patch` = 首发后 ≥7 天仍有实质修订（`editedAt` 是语义修订时间，schema 已有）。
- stdout 条目被「一行」引用后剔除的逻辑保持现状。
- 每行追加的 `kind` 同时决定状态 tag 的颜色语义（见 §4.4）。

### 3.2 90 天热力条数据

```ts
// 数据源：notes + thinkings + moments 三合一（草稿已过滤）
const DAYS = 90;
const today = startOfDay(new Date());
const days = Array.from({ length: DAYS }, (_, i) => {
  const day = addDays(today, i - (DAYS - 1));
  return { date: day, count: 0 };   // count: 当天发布条目数
});
// 遍历三个 collection，按 startOfDay(date) 命中累加
```

- 输出给模板的就是 90 个 `{ date, count }`，渲染为 90 根 `<span>`，count≥1 为活跃格。
- 活跃格透明度分档：`count===1 → 1.0 / count>=2 → 1.0`，不分级——**活跃度只分有/无**，避免虚假精确（一天写 3 篇不比 1 篇更"稳定"）。简化：活跃格统一 `--accent` 全亮。
- 构建快照性质：今天之后的格子不存在（只渲染到今天），无未来态。

### 3.3 状态横幅数据

```ts
const SITE_FOUNDED = new Date("2026-08-25");   // git 仓库建立日，写常量
const uptimeDays = daysBetween(SITE_FOUNDED, today);

// 组件行：静态声明 + build 时校验
const services = [
  { name: "core",   path: "/" },
  { name: "blog",   path: "/notes" },
  { name: "moments",path: "/thinkings" },
  { name: "lab",    path: "/lab/" },
  { name: "rss",    path: "/rss.xml" },
  { name: "admin",  path: "https://admin.monostich.cloud", external: true },
];
```

- 「组件行全绿」不是假数据表演：每个组件就是本站一个真实路由，构建能过 = 路由存在 = operational。文案 `6/6 operational` 的 6 是数组长度。
- 每项渲染为 `<a>` 指向对应路由（可点的状态行，也是导航彩蛋）。
- uptime 天数用 `tabular-nums`，标题 `uptime` 字样旁不加点单位以外的装饰。

### 3.4 /proc 表数据

`src/data/lab.js` 现有 `{ name, desc, href, kind }`，**不改数据文件**。pid 在模板侧生成：`pid = 1024 + index * 37`（确定性伪随机，避免连续数字的假感；37 是质数，增量错开）。cmd 列拼 `./lab/${slugify(name)} --${kindSlug}`，其中 kindSlug 是 kind 的英文短写映射（"算法可视化"→`viz`，未知 kind 回退 `exp`）。映射表写在 index.astro 顶部常量，新增 lab 条目时未知 kind 自动降级，不阻塞。

### 3.5 Footer build hash

```ts
const buildHash = (process.env.GITHUB_SHA ?? process.env.COMMIT_REF ?? "dev").slice(0, 7);
```

CI 里一般注入 GITHUB_SHA；本地 dev 显示 `dev`。纯展示，不可点。

---

## 4. 组件/页面 Spec（按滚动顺序）

模块头制式**全站统一**：`// NN 名目`（mono 12px、`--text-faint`、`//` 用 `--accent-dim`）——现有 `.module-head` 不变，仅各模块名目改名。所有模块标题继续挂 `data-scramble`（既有全局脚本，不动）。

### 4.1 Hero（`src/components/Hero.astro`）— 微调

- 结构、LogStream、LED、光标全部不动。
- colophon 行右侧 `monostich.cloud` 前加负载读数：
  `▲ monostich.cloud  load 0.42 0.38 0.35  up 847d`
  - `load` 三个数：构建时随机生成（0.2–0.8 一档的小数，保留两位），每次构建变化，是"这台机器真的在跑"的冷幽默。
  - `up {uptimeDays}d` 与 §3.3 同源。
  - 样式：mono 12px `--text-faint`，`up` 数字 `--text-muted`，与现 colophon 同一行。移动端（≤600px）隐藏 load 段，只留 `▲ monostich.cloud up {n}d`。
- LED 保持琥珀硬闪烁（**不**改绿——它是全站两处磷光之一，琥珀=人文的规则在这里让位于既有身份）。

### 4.2 StatusBar（新组件 `src/components/StatusBar.astro`）★核心

位置：Hero 之后、NowStrip 之前，全宽横条。**与 NowStrip 合并为一根双行条**（NowStrip 不再独立存在，避免两根相邻横条）：

```
┌──────────────────────────────────────────────────────────┐
│ ▲ monostich · OPERATIONAL          uptime 847d · 6/6 ok  │  ← 行1：状态
│  ● core  ● blog  ● moments  ● lab  ● rss  ● admin        │  ← 行2：组件
└──────────────────────────────────────────────────────────┘
  ❯ now  building <b>argus-gateway</b> — …  reading …      ← NowStrip 原样紧随其后（保留）
```

- 容器：`background: var(--surface)`、`border-block: 1px solid var(--border-subtle)`、`padding-block: 13px`。
- 行1：`▲` 用 `--ok`；`monostich` 文字 `--text` mono 13px 500；`OPERATIONAL` `--ok` mono 12px letter-spacing .12em；右侧 `uptime {n}d · 6/6 ok` `--text-faint` mono 12px tabular-nums。
- 行2：六项，每项 `●`（8px 圆点，`--ok`，带 6px `--ok` 30% 光晕）+ 名称 mono 12px `--text-muted`；整项是 `<a>`（§3.3），hover 名称变 `--accent`；项间距 22px。
- 灯效：**静态常亮，不闪烁**（稳定运行=无事件；闪烁是 Hero LED 的特权，全站只有它闪）。reduced-motion 无需特判（无动画）。
- `admin` 项外链，名称后加 `↗`，`rel="noopener"`。
- 移动端（≤640px）：行2 横向滚动（`overflow-x:auto`，隐藏滚动条，复用 NowStrip 既有手法）；行1 右侧缩为 `{n}d · 6/6`。
- a11y：组件行 `<ul role="list">`，`●` 用 `aria-hidden`，每项含 sr-only `operational`；行1 整体 `role="status"` 不需要（静态内容，非 live region）。

### 4.3 stdout（原「一行」，index.astro 内 section）

- 模块头：`// 01 stdout`。
- 结构改造（blockquote 语义保留，视觉换壳）：

```
  22:41:07 [stdout] 夜里的服务器比白天诚实。          2026.08.29
```

- 单行网格：`auto(前缀) minmax(0,1fr)(正文) auto(日期)`，gap 16px，baseline 对齐。
- 前缀：`HH:MM:SS`（该 moment 的真实发布时间，mono 11.5px `--text-faint` tabular-nums）+ `[stdout]`（mono 11.5px `--text-faint`，方括号内字母 `--accent-dim`）。
- 正文：`var(--serif-zh)` **保留衬线**、`clamp(1.15rem, 2.2vw, 1.5rem)`、`--text`——诗意用字体而不是装裱表达；左侧 `>` 引用符**删除**（装裱感来源）。
- 日期：mono 11.5px `--text-faint` dotDate。
- hover：无（它不是链接；点击进入小记流的入口由模块头右侧 `小记 →` 承担，保留）。
- 移动端：前缀独占一行，正文+日期第二行。

### 4.4 deploy log（原「目录」，index.astro 内 section）★核心

- 模块头：`// 02 deploy log`，右侧 `全部 →` 保留。
- 每行 grid：`108px(date) 92px(kind) minmax(0,1fr)(title) auto(status)`，gap 20px，padding-block 20px，行底 `--border-subtle`（现状保留）。
- **kind 列**：mono 11px，前导 `▪`：
  - `deploy` → `▪` + 文字 `--accent`（琥珀=人文创作）
  - `patch` → `--text-muted`
  - `stdout` → `--text-faint`
  - `postmortem` → `--bad`
- **status 列**：mono 11px pill（`border-radius: 999px`、`padding: 2px 9px`、底+文字同色阶）：
  - deploy/stdout → `[ok]`：`--ok` 文字 + `--ok-soft` 底
  - patch → `[ok]` 同上（patch 完成态也是 ok）
  - postmortem → `[rcvd]`：`--bad` 文字 + `--bad-soft` 底（recovered 的缩写，已复盘=已恢复；文案也可定 `[closed]`，落地时试排后定稿）
- 标题列：`var(--serif-zh)` 1.12rem 保留现状。
- 行号 gutter（56px 编号列）**删除**——kind 列替代了它的信息职能，编辑器 gutter 语汇让位给 status page 语汇。
- hover 反馈（与全站统一）：标题变 `--accent` + `translateX(3px)`，行底 `color-mix(in srgb, var(--accent) 4%, transparent)`。
- 移动端（≤640px）：grid 改 `92px minmax(0,1fr) auto`，date 移到第二行（grid-column 2），padding-block 16px。
- 条目数：5 条保留。

### 4.5 uptime 热力条（deploy log 节内，列表下方）

```
  90d activity  ▁▁█▁▅█▁▁█▃▁▁▁█▁█▁▁▅▁█▁▁█▁▁█▃▁█   62/90 days · last deploy 2d ago
```

- 结构：一行 flex，左 label（mono 11px `--text-faint`），中 90 格，右统计（mono 11px `--text-faint` tabular-nums）。
- 格子：`<span>` 宽 4px、高 14px、gap 2px；静默格 `--surface-3`；活跃格 `--accent`（hover 格显示 `title="{date}: {count} 篇"`）。
- `last deploy {n}d ago` 从 `recent[0].date` 算；n=0 显示 `today`。
- 它是"稳定运行"叙事的核心视觉证据：一条稀疏但持续的琥珀点线，比任何文案都可信。
- 容器 `margin-top: var(--space-lg)`，无框无底，保持"读数行"而非"卡片"。
- 移动端：格子压缩为宽 3px gap 1.5px，或截断为最近 60 格（`overflow:hidden` + `direction:rtl` 让左侧旧数据溢出隐藏——rtl 截断方案优先，天然保留最新数据靠右对齐）。
- a11y：热力条 `role="img"`，`aria-label="过去 90 天中 62 天有发布"`；格子 `aria-hidden`。

### 4.6 services（`src/components/Projects.astro` 重写）

- 模块头：`// 03 services`，右侧 `GitHub ↗` 保留。
- 从三栏横线行改为 **2 列卡片网格**（≤700px 单列），gap 16px：

```
  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ argus-gateway   ● running│  │ ZcodeRCLI     ◐ building│
  │ LLM 网关：统一鉴权、限流… │  │ 用 Go 写的 Coding Agent…│
  │ go · llm · gateway    ↗  │  │ go · coding-agent · cli ↗│
  └─────────────────────────┘  └─────────────────────────┘
```

- 卡片：`background: var(--surface-2)`、`border: 1px solid var(--border-subtle)`、`border-radius: 10px`、`padding: 20px 22px 18px`。整卡 `<a>`（repo 为 `#` 时渲染 `<article>`，现状逻辑保留）。
- 上排：名称 mono 0.95rem 500 `--text` + 状态（右侧）。
- 状态映射（`projects.js` 的 status 字段不动）：
  - `active` → `● running`：`--ok` 灯 + `--ok` 文字（mono 11px）
  - `developing` → `◐ building`：`--accent-dim` 半圆 + `--accent-dim` 文字（建设中用琥珀=人在干活）
  - 其他/未知 → `○ retired`：`--text-faint`（预留，当前数据无）
  - 灯 8px，常亮不闪；`◐` 用 CSS 半圆（`border-radius: 50%` + 线性渐变半边填充）或字符 `◐` 直接渲染（字体回退风险低，JetBrains Mono 无此字形但系统等宽有；优先 CSS 方案）。
- 中排：描述 `--text-muted` 0.92rem、1.6 行高、`max-width: 46ch`。
- 下排：tags mono 11px `--text-faint`，`·` 分隔纯文本（**不用** chip/pill 框——框太多会像 dashboard 模板）；右侧 `↗` `--text-faint`，hover 淡入。
- hover（`@media (hover:hover)`）：`translateY(-2px)` + 边框转 `color-mix(in srgb, var(--accent) 35%, var(--border))` + `box-shadow: 0 10px 28px rgba(0,0,0,.35)`（暗色；浅色用 `--shadow-md` token）+ 名称变 `--accent`。
- 展示全部 4 个，不 slice。

---

### 4.7 proc（原「杂物间」，index.astro 内 section）

- 模块头：`// 04 proc`，右侧 `全部 →`（`/lab/`）保留。
- 渲染为只读进程表，mono 12px：

```
  pid   name                  cmd
  1024  sliding-window-max    ./lab/sliding-window-max --viz
```

- 三列 grid：`64px minmax(140px,220px) minmax(0,1fr)`，baseline 对齐，padding-block 14px，行底 `--border-subtle`。
- 表头行：`pid/name/cmd` 三个列名，mono 11px `--text-faint` letter-spacing .08em，底边 `1px solid var(--border)`，无 hover（不是链接）。
- 数据行整行 `<a href={item.href}>`：pid `--text-faint` tabular-nums；name `--text`；cmd `--text-muted`，溢出省略。
- 附加信息钩子：desc 不进表（表要保持干净），放在行 `title` 属性（hover 浮层）+ 行内 sr-only。
- hover：name 变 `--accent` + 行底 accent 4%（与 deploy log 一致）。
- 移动端（≤640px）：表头隐藏（小屏无需列名），grid 改 `56px minmax(0,1fr)`，cmd 移到第二行。

### 4.8 Footer（`src/components/SiteFooter.astro`）

从"版权行"改为"控制台行"：

```
  $ uptime — 847d        $ rss — /rss.xml        $ mail — 292081295@qq.com
  $ git log —oneline · build a1b2c3d · © 2026 Aloha
```

- 两行结构，mono 12px `--text-faint`。
- 上行：三个可点命令（`/about` 或 `#`→uptime 锚到 StatusBar、`/rss.xml`、mailto），格式 `$ {cmd} — {值}`；`$` 用 `--accent-dim`，cmd `--text-muted`，值 `--text-faint`；整项 hover 全部变 `--accent`。
- 下行：不可点的纯读数 `build {hash}`（§3.5）+ `© {year} Aloha` + 保留现有 `管理` 后台入口（样式不变）。
- 原 `GitHub ↗` 链接移出：services 模块头已有 GitHub 入口，Footer 不再重复（与 SPEC-pages §0.4 既有决策一致）。
- 边框、间距沿用现状。

### 4.9 Nav（`src/components/Nav.astro`）

不动结构，只改主题色 meta 值（§2.4）。品牌 `Aloha.` 保留。

---

## 5. 动效清单与性能约束

| 动效 | 位置 | 触发 | 降级 |
|---|---|---|---|
| 日志瀑布 canvas | Hero | 循环（既有） | reduced-motion 静帧（既有） |
| LED 硬闪烁 2.1s | Hero colophon | 循环（既有） | reduced-motion 停（全局规则已覆盖） |
| 光标硬闪烁 1.6s | Hero 标题 | 循环（既有） | 同上 |
| scramble 解码 | 模块头/年 | 入视口一次（既有） | reduced-motion 直显（既有） |
| reveal 480ms | [data-reveal] | 入视口一次（既有） | 直显（既有） |
| hover 位移/变色 | 列表行、卡片、命令行 | hover | `@media (hover:hover)` 内 |

**本轮新增动效数量：0。** StatusBar 灯常亮、热力条静态、proc 表静态、卡片只有 hover transform——"稳定运行"的气质靠**不动的仪表**表达，动画多反而破坏信任感。全部新视觉都是静态排版 + CSS 一次绘制的格子/灯，无 rAF、无合成层常驻。

性能预算：首屏新增 DOM ≈ 90（热力格）+ 20（状态条）+ 30（卡片/proc）≈ 140 节点，无图片无字体新增；热力条不挂事件（原生 title 浮层）。

---

## 6. 浅色主题专项

浅色 = 「白天机房的打印输出」：冷灰白纸面 + 黑字 + 深琥珀标注 + 深绿/深红状态。

- token 全表见 §2.2；关键是**去黄**：`--bg #f2f3f5`、`--surface-2/3` 灰阶化、阴影冷灰化。
- StatusBar 在浅色下 `--surface` 白底 + `--border-subtle`，绿灯用 `--ok #15803d`（深绿保证 4.5:1）。
- 热力条静默格 `--surface-3 #dee1e7` 在白底上仍可见；活跃格 `--accent #b45309`。
- Hero 在浅色的既有回落（`--hero-title: var(--text)` 等）不动；LogStream 颜色读 CSS 变量的机制天然适配（既有实现）。
- 验收：切换不报错、正文/状态色对比度达标（§2.3）、无米色残留（全站 grep `#f4f3ee|#f2f0e8|#e7e4d8|58,42,24` 应为零）。

---

## 7. 实施分期

### P0 — token 与语汇地基（global.css 为主）
1. 双主题 token 替换（§2 全表，含 `--ok/--bad` 新增、浅色灰白化、阴影冷灰化）
2. Nav/BaseLayout 的 meta theme-color 同步
3. 全站 grep 清理旧米色 hex（含 ArticleLayout、thinkings 等内页局部 hardcode 检查）
4. 验收：双主题切换、对比度抽测、内页无回归

### P1 — 首页结构（index.astro + 新组件）
1. StatusBar 组件（含 NowStrip 合并、§3.3 数据）
2. deploy log（kind 判定 §3.1、行结构改造）
3. uptime 热力条（§3.2 数据 + §4.5 渲染）
4. stdout 改造（§4.3）
5. services 卡片（§4.6，Projects.astro 重写）
6. proc 表（§4.7，含 §3.4 pid/kindSlug 生成）
7. Footer 命令行（§4.8）
8. Hero colophon load 读数（§4.1）

### P2 — 打磨（另行排期，不在本轮）
- 滚动时命令回显（`$ monostich log --last 5` 式转场，原方案 B 的降级版）
- ⌘K 搜索（沿用旧 SPEC P2）
- 热力格 hover 增强浮层（原生 title 的样式化替代）

---

## 8. 落地前待确认（阻塞项）

1. `[rcvd]` vs `[closed]`：postmortem 行的状态 pill 文案（落地时试排定稿，也可接受 `resolved` 截断）。
2. StatusBar 组件行第三项：moments 指向 `/thinkings`（小记住在那里），命名是 `moments` 还是 `thinkings`？（建议 `moments`，服务名说人话）
3. `SITE_FOUNDED` 用 git 建仓日 2026-08-25 是否准确（若博客实际更早上线可改）。
4. lab.js 的 kind 目前只有「算法可视化」一类，kindSlug 映射表先只登记 `viz` + 回退 `exp`，可以吗。

## 9. 验收对照

- [ ] 暗色底为 #0b0d10 系；浅色全站无米色残留，呈冷灰白
- [ ] StatusBar 显示 OPERATIONAL + 真实 uptime 天数 + 6 个可点组件（全绿）
- [ ] deploy log 每行有 kind 标记与状态 pill；moments 行显示 stdout
- [ ] 热力条渲染 90 格，活跃格数与 collection 实际日期一致，统计数正确
- [ ] services 四张卡片，状态灯绿/琥珀分流，repo 为 # 的卡不可点
- [ ] proc 表三列对齐，pid 确定性生成，行可点
- [ ] Footer 两行命令行，build hash 本地显示 dev
- [ ] stdout 节无前导 `>`，前缀为真实发布时间 + [stdout]
- [ ] 全站无新增加载动画；StatusBar 灯常亮不闪
- [ ] 绿/红/琥珀/灰四色语义无互串；功能色均伴随文字或符号
- [ ] reduced-motion、键盘 focus、hover-less 设备均无回归
- [ ] 内页（archive/notes/thinkings/about/lab/文章页）P0 后视觉无回归

