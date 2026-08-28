# 全站页面设计 Spec（首页以外）

> 版本：v1（2026-08-29）
> 前置：本文档依赖 `SPEC.md`（首页 Spec）中的设计概念、tokens、动效体系，tokens 以 P0 落地后的 `global.css` 为准。
> 范围：Archive / Notes / Thinkings（含小记）/ About / Search / 文章详情页（ArticleLayout）/ 共享模式（页头、页脚）。
> 原则：**不新增视觉元素种类，只做统一与收敛**。首页确立的语言（mono 记号、衬线中文、乱码解码、克制的橙色）在这些页面复用。

---

## 0. 全站统一规则（所有页面适用）

### 0.1 「屏幕内外」的延伸
首页 Hero 之外的所有页面都属于"屏幕外"——**任何页面不得出现**扫描线、噪点、暗角、RGB 色散。终端感只能通过以下元素表达：
- mono 字体的 eyebrow（`/ archive` 形式，橙色）
- 乱码解码标题
- 终端式硬闪烁光标（仅限 About 页既有用法）
- 代码块、chip、`❯`/`▸`/`←`/`↗` 等符号系统

### 0.2 页头模式（page-head）统一
当前 archive/notes/thinkings/search/about 五个页面各写了一份 `.page-head` / `.back-home` 样式（重复代码）。落地时：
1. 把 `.page-head`、`.back-home`、`.eyebrow` 的样式**提取到 `global.css`**，各页面删除本地副本。
2. 统一结构：
   ```
   [← 返回主页]          ← .back-home（现有样式不变）
   / archive            ← .eyebrow（mono 13px, --accent）
   ```
3. **大标题乱码解码**：Notes / Thinkings / Search 三个列表页的 `<h1>` 加 `data-scramble`（算法见 SPEC.md §4.6，复用 BaseLayout 全局脚本）。Archive 无大标题（只有 eyebrow），不加。About 页标题是终端身份区，用闪烁光标而**不用**乱码（见 §4）。
4. 各列表页 h1 字号统一 `clamp(3rem, 6vw, 5.5rem)`；Thinkings 的 h1 保留斜体（`font-style: italic; font-weight: 400`）作为该栏目的性格差异，这是**有意为之的唯一例外**。

### 0.3 列表行 hover 语言统一
全站所有"日期 + 标题"列表行（首页 Recent、Archive、Notes）统一为同一组反馈：
- 行底：`color-mix(in srgb, var(--accent) 4%, transparent)`
- 标题：变 `--accent` + `translateX(3px)`
- 箭头：`translate(2px, -2px)` + 变橙
- 均包在 `@media (hover: hover)` 内
现状三处已基本一致，落地时核对参数统一即可，不重新设计。

### 0.4 页脚（SiteFooter.astro）
- 保持一行结构，链接组更新为：`GitHub ↗`（https://github.com/A1oha666）/ `RSS` / `Email`（mailto:292081295@qq.com）/ `管理`（保留现有后台入口，样式不变）。
- `Archive`/`About` 链接从页脚移除（导航已有，避免重复）。
- 字号降到 12px，颜色 `--text-faint`，上边框用 `--border-subtle`。

---

## 1. Archive（src/pages/archive.astro）

定位：全站内容的"数据库视图"，信息密度最高的页面，风格应最像终端输出。

### 1.1 结构（不变）
筛选 pill 行 → 计数行 → 按年分组列表。筛选逻辑（`?type=` + JS 过滤）不动。

### 1.2 视觉调整
| 元素 | 现状 | 改为 |
|---|---|---|
| 年份标题 `h2` | mono, `clamp(1.6rem,3vw,2.2rem)`，无色散 | **加 `data-scramble`**：年份数字入视口时乱码解码（"2026" 从符号翻滚成数字，是全站最契合该动效的位置） |
| 筛选 pill | 描边方块 | 样式不变；`is-active` 态背景从 accent 8% 调到 `var(--accent-soft)` 保持 token 一致 |
| 类型 chip（Notes/Thinkings） | notes 橙色描边、thinkings 白描边 | **与首页 Recent 的 chip 统一**：统一为 `accent-soft` 底 + `--border-subtle` 描边 pill（`border-radius: 999px`），不再按类型分色；类型区分靠文字本身 |
| 行分隔 | `--border` | `--border-subtle`（长列表减轻线条噪音） |
| 计数行 | `--text-faint` mono | 不变 |

### 1.3 移动端
现有 ≤600px 布局（date 独占行、chip 换行）保留。

---

## 2. Notes（src/pages/notes.astro）

定位：工程笔记索引，气质 = "文档目录"。

### 2.1 结构（不变）
页头（eyebrow + h1 + 一句话）→ 计数行 → 列表（date / 标题+摘要 / ↗）。

### 2.2 视觉调整
- h1 加 `data-scramble`。
- **列表标题 h2 改 `var(--serif-zh)`**：笔记标题多为中文，衬线标题与摘要的灰度形成层次（现状是无字体区分的中文标题）。
- 列表行 grid 保持 `112px 1fr 20px`；行分隔改 `--border-subtle`。
- 摘要 `p` 颜色保持 `--text-muted`，加 `max-width: 65ch` 既有规则不变。
- 计数行样式与 Archive 计数行完全一致（复用 0.2 提取的全局类）。

---

## 3. Thinkings（src/pages/thinkings.astro，含小记）

定位：最"人"的页面，报纸专栏感。这是全站中文排版（`.prose-zh` 规则）的**主战场**。

### 3.1 结构（不变）
thinking 标题卡（编号 + 大标题 + 摘要 + 阅读全文）与 moment 内联卡按时间混排。

### 3.2 视觉调整
| 元素 | 改为 |
|---|---|
| h1 | 保留斜体例外 + 加 `data-scramble` |
| thinking 标题 h2 | 改 `var(--serif-zh)`，`max-width: 20ch` 保留；中文长标题衬线后更像专栏头条 |
| thinking 摘要 / moment 正文 | **应用 `.prose-zh` 规则**（1.85 行高、两端对齐、中西文间距、0.015em 字距）；颜色保持 `--text-muted` |
| moment 正文内元素 | blockquote 左竖线 2px `--accent` 保留；链接 accent 下划线保留 |
| 序号 `.thinking__number` | 保留，颜色 `--text-faint` → 不变 |
| meta 列（label + date） | label 橙色保留；"小记" 用 `--text-faint`（现状 `--text-muted`，再降半级，让位给 thinking 的 label） |
| 条目分隔 | 列表顶部 `--border-strong`、条目间 `--border-subtle` |
| hover | 条目底色 accent 3% 保留；标题变橙保留 |

### 3.3 移动端
现有 ≤600px 单列堆叠保留。

---

## 4. About（src/pages/about.astro）

定位：全站唯一"终端本体"页面——首页 Hero 是显示器，About 是 shell。允许这里是 mono 浓度最高的页面。

### 4.1 结构与内容重设计
现状只有三行 facts（email/github/location=Here）。改为 `whoami` 输出块：

```
[← 返回主页]
/ about

aloha_                    ← h1, mono, 既有硬闪烁光标（保留，闪烁节奏与首页横线光标统一为 2.6s steps(1)）
$ whoami

name     张淇睿 / Aloha
base     nanjing, cn · njupt · cs class of 2028
focus    backend · agent engineering
stack    go / java / swift
status   open to daily intern
email    292081295@qq.com
github   @A1oha666
```

- h1 + `_` 光标：`about-blink` 从 1.6s 改 **2.6s**（与首页 `.hero__cursor` 的 `cursor-blink` 同节奏；两处动画合并为 global.css 里的一个 `@keyframes cursor-blink` 复用）。
- `$ whoami` 行：mono 13px，`--text-faint`，`$` 用 `--accent`。
- facts 表：`dt` 宽度从 5.5ch 加宽到 **8ch**（容纳 `status`），`dt` 用 `--text-faint`，`dd` 用 `--text-muted`，链接样式（下划线 hover 变橙）保留现状。
- 整页不加 `data-scramble`（终端是"已解码完成"的地方，神秘感靠光标和留白）。

### 4.2 待用户提供
`base` 行文案是否照写（学校/年级）；`status` 文案。未确认前按上面默认值落地。

---

## 5. Search（src/pages/search.astro）

定位：功能页，设计目标是"不突兀"。

- h1 加 `data-scramble`；页头结构与 0.2 统一。
- Pagefind UI 变量映射更新到新 tokens：
  ```css
  --pagefind-ui-primary: var(--accent);
  --pagefind-ui-text: var(--text);
  --pagefind-ui-background: transparent;
  --pagefind-ui-border: var(--border);        /* 原 --border-strong，收敛 */
  --pagefind-ui-border-radius: var(--radius-sm);
  --pagefind-ui-font: var(--mono);
  ```
- 结果标题字体是 pagefind 默认 UI 内元素，不强行衬线化（第三方 shadow DOM 成本不值）。
- 加载/错误提示样式不变。

---

## 6. 文章详情页（src/components/ArticleLayout.astro）

定位：阅读体验的终点，"屏幕外"那张纸。这是本 Spec 改动最重的页面。

### 6.1 容器重构（重要）
现状：整篇文章是一个浮在页面上的大卡片（`border + radius + background: --surface + shadow-md + z-index:1001`），这是旧全局扫描线时代"内容浮在特效上"的遗留。扫描线删除后：
- **拆除外壳卡片**：`.article` 改为透明无框（`border: 0; background: transparent; box-shadow: none; z-index: auto; border-radius: 0`），内容直接落在 `--bg` 上。
- 头部与正文之间用一道 `--border-subtle` 横线分隔（替代卡片边缘）。
- 文章页成为全站最"空"的页面：只有字，没有框。

### 6.2 阅读进度条（新增）
- 位置：`position: fixed; top: var(--nav-height) - 1px`（贴在 nav 下沿），左 0，高度 **2px**，`background: var(--accent)`，`transform-origin: left`，按滚动比例 `scaleX`。
- 实现：ArticleLayout 的现有 `<script>` 里加一个 `scroll` 监听（`requestAnimationFrame` 节流，`passive: true`）；`document.documentElement.scrollTop / (scrollHeight - innerHeight)`。
- `prefers-reduced-motion` 不影响（纯位置映射，非动画）；无 JS 时元素不渲染。

### 6.3 头部
- eyebrow `/ notes`、返回链接、h1、summary、meta 行结构不变。
- **h1 改 `var(--serif-zh)` 检测**：标题是中文时衬线（实现：h1 直接应用 `font-family: var(--serif-zh)`，Fraunces 不含中文字形，英文标题自然回落 Fraunces——不需要 JS 检测，font stack 自动处理）。`max-width: 14ch` 放宽到 **18ch**（中文标题字宽更均匀，14ch 对中文过挤）。
- meta 行：`/` 分隔符颜色 `--border-strong` 保留。

### 6.4 正文排版（`.article__content`）
- 中文段落应用 `.prose-zh` 同等参数：直接在 `.article__content` 上设 `line-height: 1.85; letter-spacing: 0.015em; text-align: justify; text-spacing-trim: space-all`（正文容器整体即是中文阅读区；英文内容受影响极小，justify 对短英文段落无碍）。
- h2/h3 标题改 `var(--serif-zh)`，字重 600。
- 代码块 `pre`：背景从 `--surface` 改为 **`#17140f`（新增 token `--code-bg`，亮色系对应 `#f5efe4`）**，与文章底色拉开；加顶部语言条——**不新增 DOM**，用 `.codeblock::before` 读取 `pre code[class*="language-"]` 的语言名（JS 包装 codeblock 时顺手写 `data-lang` 到 wrapper，`::before { content: attr(data-lang) }`）：mono 10.5px、`--text-faint`、左上内嵌。复制按钮现有逻辑不动，样式改到语言条右侧对齐。
- 行内 `code`：`accent-soft` 底保留。
- blockquote、图片、hr、链接样式保留现状参数。

### 6.5 TOC（左侧）
- 现有 scrollspy 逻辑不动。
- 视觉：`border-left` 从 `--border` 改 `--border-subtle`；激活项除变橙外，左侧加 2px accent 竖线（`box-shadow: -2px 0 0 var(--accent)` 或 padding 补偿，避免位移）。

### 6.6 上一篇/下一篇
- 结构不变；两格之间加 `--border-subtle` 左分隔线（next 列）；hover 的 `translateY(-2px)` 保留。

---

## 7. 动效复用表（本文档新增/复用汇总）

| 动效 | 页面 | 说明 |
|---|---|---|
| 乱码解码 | Notes/Thinkings/Search h1、Archive 年份 | 复用 SPEC.md §4.6 全局脚本，零新代码 |
| 光标硬闪烁 2.6s steps(1) | About h1（`_`）、首页 Hero（横线） | `@keyframes cursor-blink` 提取到 global.css 复用 |
| reveal | 全部 | 既有 |
| 阅读进度条 | 文章页 | 新增，滚动映射非动画 |
| 列表行 hover | 全部列表 | 参数统一，见 0.3 |

---

## 8. 实施映射（文件级）

| 文件 | 改动 |
|---|---|
| `src/styles/global.css` | 新增 `.page-head`/`.back-home`/`.eyebrow` 全局类、`@keyframes cursor-blink`、`--code-bg` token、`.prose-zh`（P0 已含） |
| `src/layouts/BaseLayout.astro` | 无新增（乱码脚本 P1 已入） |
| `src/pages/archive.astro` | 删本地 page-head 样式；年份 h2 加 `data-scramble`；chip 统一；分隔线换 `--border-subtle` |
| `src/pages/notes.astro` | 删本地 page-head 样式；h1 加 `data-scramble`；列表 h2 换 `--serif-zh` |
| `src/pages/thinkings.astro` | 删本地 page-head 样式；h1 加 `data-scramble`；标题换 `--serif-zh`；摘要/moment 正文应用 prose-zh 参数 |
| `src/pages/about.astro` | 内容块重写（whoami 结构）；blink 节奏换 2.6s；dt 宽 8ch |
| `src/pages/search.astro` | h1 加 `data-scramble`；pagefind 变量换 `--border` |
| `src/components/ArticleLayout.astro` | 拆外壳卡片；进度条；h1/正文/h2h3 字体与排版；代码块语言条 + `--code-bg`；TOC 激活竖线 |
| `src/components/SiteFooter.astro` | 链接组更新（GitHub/RSS/Email/管理） |

工期建议：作为 **P1b** 跟在首页 P1 之后，一次提交一个页面，顺序：global.css 提取 → Archive → Notes → Thinkings → ArticleLayout → About → Search/Footer。

---

## 9. 验收 checklist

- [ ] 五个列表/功能页共用同一套 page-head 样式（无页面级重复 CSS）
- [ ] Notes/Thinkings/Search h1 与 Archive 年份入视口播放乱码解码，reduced-motion 直显
- [ ] 全站列表行 hover 参数完全一致
- [ ] Thinkings 摘要与小记正文为 1.85 行高 + 两端对齐 + 中西文自动间距
- [ ] About 为 whoami 结构，光标闪烁与首页横线光标同节奏（2.6s）
- [ ] 文章页无外壳卡片，内容直接落在底色上；滚动时 nav 下沿有 2px 橙色进度条
- [ ] 文章中文标题/正文/标题层级均为衬线，代码块有语言标识与独立底色
- [ ] 除 About 光标外，首页以外页面无任何 CRT 特效元素
- [ ] 页脚链接为 GitHub / RSS / Email / 管理

## 10. 待确认

1. About 页 facts 内容（base/status 行文案）——默认按 §4.1 落地。
2. Archive 类型 chip 统一为单色（放弃 notes 橙/thinkings 白的分色）——如想保留分色请告知。
3. 文章页拆除外壳卡片是本次最激进的变化，若想保留一点"纸"的感觉，备选方案是保留 `--surface` 底但去掉边框和阴影。
