# 博客首页重设计 — 设计/实现 Spec

> 版本：v3 定稿方向（2026-08-29）
> 视觉基准：`design-preview/index.html`（高保真静态样例，落地时以本文件 + 样例页为准）
> 范围：暗色主题优先；视觉层 + 首页结构；不动 Astro 内容管线（PocketBase loader、路由、RSS 不变）

---

## 1. 设计概念

**「屏幕内外」**：CRT 复古终端是身份符号，不是全局皮肤。
Hero 是那台亮着的老显示器（扫描线 / 噪点 / 暗角 / 扫光 / 呼吸全保留）；滚出 Hero 后进入干净、安静、以阅读为核心的编辑排版区。全局扫描线删除。

气质关键词：**暖暗、克制、有一点神秘**。橙色是唯一的强调色，且只在"关键时刻"出现（kicker、光标、hover、解码中的乱码字符）。

用户确认过的方向决策：

| 决策点 | 结论 |
|---|---|
| 风格 | 保留 CRT 但收敛到 Hero，正文区干净 |
| 语言 | 界面英文为主，中文内容做混排排版优化 |
| 范围 | 视觉 + 首页结构重排 |
| 主题 | 暗色优先打磨，亮色只同步 token 保证可用 |
| 明度 | 以 v1 样例（`#131110` 档）为准，不要 v2 的过暗 |
| 中文标题字体 | 衬线（华文中宋栈），不换黑体 |
| Hero facts 行 | 英文 |
| Hero 光标 | 横线光标（不是块光标） |
| 模块标题 | 乱码解码动效（data-scramble） |

---

## 2. Design Tokens（暗色）

落地到 `src/styles/global.css` 的 `:root, :root[data-theme="dark"]`：

```css
--bg: #131110;            /* 原 #151009，去棕转中性暖灰 */
--bg-glow: #241a10;       /* 原 #33200e，收敛 */
--surface: #1b1815;
--surface-2: #221e19;
--surface-3: #2b2620;     /* 新增第三层 */
--text: #ece7df;          /* 原 #f5efe6，略降刺眼 */
--text-muted: #a39a8d;    /* 原 #b0a696，提高在暖灰底上的可读性 */
--text-faint: #7d766c;
--accent: #f97316;
--accent-deep: #ea580c;
--accent-soft: rgba(249, 115, 22, 0.12);
--accent-dim: rgba(249, 115, 22, 0.55);   /* 新增：乱码字符/光标余晖 */
--accent-glow: rgba(249, 115, 22, 0.42);
--border-subtle: rgba(236, 231, 223, 0.06);  /* 新增，列表分隔用 */
--border: rgba(236, 231, 223, 0.10);
--border-strong: rgba(236, 231, 223, 0.18);
--on-accent: #1a0e05;
```

亮色系：只同步新增 token 名（`--surface-3`、`--accent-dim`、`--border-subtle`），数值沿用现有亮色调性，不做精细打磨。

**删除**：`--crt-line`（全局扫描线变量随 `body::after` 一起移除）；其余 `--crt-*` 变量保留但只被 Hero 引用。

字体栈：

```css
--serif: 'Fraunces', 'STZhongsong', '华文中宋', Georgia, serif;
--serif-zh: 'STZhongsong', '华文中宋', 'Songti SC', SimSun, serif;  /* 标题正文同族 */
--mono: 'JetBrains Mono', 'Cascadia Mono', ui-monospace, Consolas, monospace;
```

布局/动效 token 沿用现有（`--nav-height`、`--page-gutter`、`--maxw: 1080px`、`--maxw-prose: 720px`、`--ease-out`、`--ease-spring`），`--dur-reveal` 从 360ms 调到 480ms。

---

## 3. 全局 CSS 变更（global.css）

1. **删除 `body::after` 全局扫描线**（含 `forced-colors` 里的对应规则可一并清理）。
2. 新增中文排版工具类：

```css
.prose-zh {
  font-family: var(--serif-zh);
  line-height: 1.85;
  letter-spacing: 0.015em;
  text-align: justify;
  text-spacing-trim: space-all;  /* Chromium 中西文自动间距，不支持则降级 */
}
```

3. reveal 动画：`translateY(10px)` 不变，时长走 `--dur-reveal: 480ms`；现有 `prefers-reduced-motion` 降级逻辑原样保留。

---

## 4. 组件/页面 Spec

### 4.1 Nav（`src/components/Nav.astro`）

- 链接 hover 下划线动画保留；**新增当前页常驻态**：`aria-current="page"` 时下划线 `scaleX(1)`、颜色 `--text`。当前页判断在 Astro 侧用 `Astro.url.pathname` 输出。
- 右侧新增搜索入口按钮：`Search ⌘K` 样式（mono 12px、`--surface` 底、1px `--border`、hover 转橙）。点击行为先占位（`href="/search"`），⌘K 全局快捷键属 P2。
- 其余（主题切换按钮、移动端横滑）不动。

### 4.2 Hero（`src/components/Hero.astro`）

结构：

```
kicker (mono, accent)
h1 两行 (Explore Deeply, / Build Deliberately + 横线光标)
intro (既有)
facts 行 (新增, 英文)
links (既有)
```

- **CRT 屏幕**：现有 `hero__screen` 三层（扫描线+暗角 / 扫光 / 噪点）全部保留，参数向样例页靠拢：
  - 扫光周期 8s → **13s**（`0%,86% → 98%,100%` 关键帧）；
  - 新增**呼吸**：`@keyframes breathe { 0%,100% {opacity:.8} 50% {opacity:.92} }`，9s ease-in-out infinite，加在 `hero__screen` 上；JS 离场暂停逻辑（`is-title-entering`）扩展为同时暂停 breathe 和 sweep。
- **横线光标**：`.hero__cursor`，`width:.62em; height:.055em; border-radius:2px; background:var(--accent)`，`box-shadow: 0 0 14px / 0 0 40px var(--accent-glow)`。**终端式硬闪烁**：`animation: cursor-blink 2.6s steps(1) infinite`（`0%,58% opacity:1 → 59%,100% opacity:0`），不要渐变呼吸。放在第二行标题末尾，`vertical-align: .02em`。
- **标题进场用 v2 柔版**（用户定稿）：标题色 `#cfc9bf`（磷光余晖，不纯白）；`line-enter` 1300ms、逐行延迟 420ms；关键帧**无位移/缩放**，只有模糊消散 + 柔和色散：
  `0% { opacity:0; blur(12px); text-shadow ±0.07em rgba(255,74,45,.4)/rgba(61,213,232,.32) }`
  `45% { opacity:.6; blur(5px); text-shadow ±0.035em 同色 }`
  `100% { opacity:1; blur(0); shadow 透明 }`
- **facts 行**（新增，英文，mono 12.5px，`--text-faint`）：
  `▸ nanjing, cn   ▸ backend · agent engineering   ▸ class of 2028   ▸ open to daily intern`
  前缀 `▸` 用 `--accent`，关键词 `<b>` 提为 `--text-muted`。
- 标题进场 RGB 色散动画（`line-enter`）按上面 v2 柔版参数替换现有版本。

### 4.3 Now strip（新组件 `src/components/NowStrip.astro`）

- 位置：Hero 之后、Recent 之前，全宽横条。
- 样式：`border-block: 1px solid var(--border-subtle)`、`background: var(--surface)`、mono 12.5px、`padding-block: 11px`。
- 内容：`❯ now` 标签（accent）+ 3 条动态（building / reading / learning），关键词 `<b>`。
- 数据源：先硬编码，后续可挪到 `src/data/`。

### 4.4 Recent（`src/pages/index.astro` 内 section）

- 数量 3 → **5**（`.slice(0, 5)`）。
- 每行 grid：`108px(date) 76px(chip) 1fr(title) 20px(arrow)`，gap 20px。
- **分类 chip**（新增）：mono 11px、`--accent-soft` 底、`border-radius: 999px`，文案：notes→`笔记`、thinkings→`随想`、moments→`小记`。映射在 index.astro 组装 `recent` 数组时写入 `kind` 字段。
- 标题字体改 `var(--serif-zh)`（衬线中文）；hover：标题变橙 + `translateX(3px)`、箭头 `translate(2px,-2px)`（现有逻辑保留）。
- 移动端（≤640px）：date 独占一行，grid 改 `76px 1fr 20px`。

### 4.5 Work（`src/components/Projects.astro`）

- `projects.slice(0, 2)` → 展示**全部**（当前 4 个）。
- 从横线列表改为 **2 列卡片网格**（≤700px 单列），卡片 `<a href={project.repo}>` 可点击：
  - 容器：`background: var(--surface-2)`、`border: 1px solid var(--border-subtle)`、`border-radius: 14px`、`padding: 24px 24px 20px`；
  - hover：`translateY(-3px)` + 边框转 `color-mix(accent 45%)` + `box-shadow: 0 14px 34px rgba(0,0,0,.42)` + 右下角 ↗ 淡入；
  - 卡内：上排 = 项目名（mono, accent）+ 状态徽标；中 = 描述（`--text-muted`）；下 = 全部 tags（mono 11px 描边小片）。
- **状态徽标**：`projects.js` 需新增 `status` 字段（`active` / `wip` / `archived`）。`active` 用绿色 `#86c98a` + `● ` 前缀，其余灰色描边 pill。
- ⚠️ 待办：`projects.js` 的 `repo` 目前是 `"#"` 占位，落地前需用户补真实 GitHub 链接；未补前卡片渲染为 `<article>` 不可点。

### 4.6 乱码解码标题（核心新动效）

- 模块标题（Recent / Selected work）加 `data-scramble` 属性，初始文本即最终文本。
- 实现放 `BaseLayout.astro` 的全局 `<script>`（与现有 reveal 脚本并列，同样监听 `astro:page-load` + 幂等）：

```
GLYPHS = "!<>-_\\/[]{}=+*^?#@%&"
进入视口 (IntersectionObserver, threshold 0.6, once) 后:
  frame 从 0 递增; 第 i 个字符在 frame >= 8 + i*3 时定稿为原字符;
  未定稿字符渲染 <span class="scramble-glyph">随机字符</span> (暗橙色 --accent-dim);
  空格始终保留; 全部定稿后 el.textContent = 原文 (清理 DOM)
```

- CSS：`[data-scramble] { min-height: 1.2em }`，`.scramble-glyph { color: var(--accent-dim) }`。
- `prefers-reduced-motion: reduce` 时不注册 observer，直接显示原文。
- **不在 Hero kicker 使用**（避免和标题进场动画抢戏；如用户后续想要再加）。

### 4.7 Footer（`src/components/SiteFooter.astro`）

- 保持简洁一行：左 `© 2026 Aloha`，右 `GitHub / RSS / Email` 链接（mono 12.5px，`--text-faint`，hover 转橙）。

---

## 5. 动效清单与性能约束

| 动效 | 位置 | 触发 | 降级 |
|---|---|---|---|
| 标题 v2 柔版色散进场 1300ms | Hero | 首屏/回视口 | reduced-motion 直显 |
| 扫光 sweep 13s | Hero 屏幕 | 循环，离场暂停（既有逻辑扩展） | reduced-motion 停 |
| 呼吸 breathe 9s | Hero 屏幕 | 循环，离场暂停 | reduced-motion 停 |
| 横线光标硬闪烁 2.6s steps(1) | Hero 标题末尾 | 循环 | reduced-motion 停（静态显示） |
| 乱码解码 | 模块标题 | 入视口一次 | reduced-motion 直显 |
| reveal 480ms | 全站 [data-reveal] | 入视口一次（既有） | reduced-motion 直显 |
| hover 微位移/变色 | 列表行、卡片、链接 | hover | `@media (hover:hover)` 内 |

性能：所有循环动画都是 `opacity`/`background-position` 级；无 layout 动画；扫描线/噪点仅限 Hero 一屏，滚动后无全局合成层开销。

---

## 6. 实施分期

### P0 — 阅读体验与 token（global.css 为主，不动结构）
1. 替换/新增 design tokens（含亮色系同步新 token 名）
2. 删除 `body::after` 全局扫描线
3. 新增 `.prose-zh` 与字阶约定
4. Hero：扫光 13s、加 breathe、横线光标、facts 行
5. Nav：当前页常驻下划线 + 搜索按钮占位

### P1 — 首页结构与组件
1. NowStrip 组件
2. Recent：5 条 + 分类 chip + 衬线标题
3. Projects：卡片网格 + 状态徽标（依赖 `projects.js` 补 `status` 字段）
4. BaseLayout：乱码解码全局脚本
5. Footer 链接行

### P2 — 打磨（不在本次范围，另行排期）
- ⌘K 唤起 pagefind 搜索、文章页阅读进度条 / TOC、CRT 页面转场、Hero 链接磁吸

---

## 7. 落地前待确认（阻塞项）

1. `projects.js`：4 个项目的真实 GitHub `repo` 链接 + `status` 取值。
2. Now strip 三条动态的初始文案（可先用样例占位）。
3. 亮色主题是否本次只做 token 同步（默认：是）。

## 8. 验收对照

- [ ] 全文无全局扫描线，CRT 效果仅存在于 Hero 屏幕框内
- [ ] Hero 有 13s 扫光 + 9s 呼吸 + 标题末尾横线光标明灭
- [ ] facts 行为英文四段（nanjing, cn / backend · agent engineering / class of 2028 / open to daily intern）
- [ ] 模块标题入视口播放乱码解码，未定稿字符暗橙色，reduced-motion 直显
- [ ] Recent 5 条带分类 chip，中文标题衬线
- [ ] Work 全部项目 2 列卡片，hover 上浮 + 橙边 + ↗
- [ ] 中文段落 1.85 行高、两端对齐、中西文自动间距（Chromium）
- [ ] 亮色主题切换不报错、可读（不追求精致）
