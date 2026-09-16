# Code Review — UI/UX 重构（未提交工作区 vs HEAD 36e38b5）

> 审查日期：2026-09-16
> 范围：`git diff HEAD` 全部 21 个文件（+159/−715），不讨论审美，仅工程质量。
> 方法：静态审读 + 全量构建验证 + headless Chrome 对 `dist/` 实测（主题切换、归档搜索态、Canvas 密度、移动端几何均以浏览器数据为准，非推测）。
> 结论：**构建通过；但有 2 个功能级缺陷（归档搜索态实际失效、主题切换锚点恢复单向失效）需修复后再合入。**

---

## P0 — 功能缺陷（浏览器实测证实）

### R-1 归档「搜索态」状态机整体失效：`hidden` 属性被作者样式覆盖

- **位置**：
  - `src/pages/archive.astro:213-214`（`syncSearchState` 用 `toggleAttribute("hidden", …)` 收起时间线与筛选）
  - `src/styles`（`archive.astro` 内 `<style>`）：`.archive__filters { display: flex; … }`（archive.astro:323）、`.archive__groups { display: grid; }`（archive.astro:350）
- **类型**：逻辑漏洞 / 级联错误
- **证据**（headless Chrome 对构建产物实测，`input` 事件触发后）：

  ```
  AFTER-TYPE filters  [hidden]=true  display=flex   visible=true   ← 应隐藏，仍可见
  AFTER-TYPE groups  [hidden]=true  display=grid   visible=true   ← 应隐藏，仍可见
  AFTER-TYPE note    [hidden]=false display=block  visible=true   ← 仅这条生效
  ```

  原因：作者样式 `display:flex/grid` 优先级高于 UA 样式表的 `[hidden] { display:none }`（作者样式整体胜出，与特异性无关）。方案 v2 T-3 的验收「输入任意词 → 时间线收起」实测不成立。
- **修复**：二选一
  1. 在 archive.astro 样式内补：
     ```css
     .archive__filters[hidden], .archive__groups[hidden] { display: none; }
     ```
  2. 或在 global.css 加全局保险 `[hidden] { display: none !important; }`（注意先全局排查是否有依赖「hidden 但仍显示」的既有写法）。

### R-2 归档「清空搜索」不回退状态：Pagefind 清除按钮不派发 `input` 事件

- **位置**：`src/pages/archive.astro:217`（仅 `el.addEventListener("input", syncSearchState)`）
- **类型**：边界状态遗漏
- **证据**（同一实测）：点击 Pagefind 自带的清除按钮后 `input.value=""`，但

  ```
  AFTER-CLEAR filters [hidden]=true（若 R-1 修好，时间线将停留在收起态）
  AFTER-CLEAR note    [hidden]=false（提示行清空后仍显示）
  ```

  源因：Pagefind UI 的清除按钮走 Svelte `bind:value`（`node_modules/@pagefind/default-ui/svelte/ui.svelte:298-306`，`on:click={() => { val=""; input_el.blur(); }}`），程序性赋值不触发 `input` 事件；Escape 清空路径（ui.svelte:255-257）同理。
- **修复**：容器上补两条委托监听，覆盖三条清空路径：

  ```ts
  el.addEventListener("input", syncSearchState);
  el.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".pagefind-ui__search-clear")) requestAnimationFrame(syncSearchState);
  });
  el.addEventListener("keyup", (e) => {
    if ((e as KeyboardEvent).key === "Escape") requestAnimationFrame(syncSearchState);
  });
  ```

### R-3 主题切换锚点恢复只对「切向深色」生效：`getElementById` 命中隐藏分支

- **位置**：`src/components/Nav.astro:90,96-99`（本次新增的 T-1 修复）；同源问题 `Nav.astro:69-70`（`syncTheme` 的 `document.querySelector('#projects')`）
- **类型**：逻辑漏洞 / 边界遗漏（重复 id + 隐藏分支）
- **背景**：首页深色分支（`.dark-home`）在 DOM 中先于浅色分支输出（index.astro:44-49），两分支各渲染一个 `id="projects"` / `id="recent"`。`getElementById`/`querySelector` 按树序返回**第一个**——浅色主题下它是 `display:none` 的深色节点，`scrollIntoView` 对零矩形元素是无操作。
- **证据**（headless Chrome 实测，视口 1200×800）：

  ```
  getElementById(#projects) → 命中 DARK 分支（displayed=false）
  L→D: scrollY 1748 → 1187，dark#projects.top=83          ← 新代码方向正确
  D→L: scrollY 停在 1187，light#projects.top=649 (viewportH=713) ← 目标元素不可见，恢复静默失效
  手动对「可见的浅色节点」scrollIntoView → top=88                ← 期望值
  ```

  即：在 `#projects` 区中部从深色切回浅色，栏目头只露出视口底部约 64px，T-1 验收「锚点区仍在视口内」实质不达标（对比正确行为 top≈88）。
- **修复**：按当前主题解析目标分支，或过滤不可见节点：

  ```ts
  const target = anchorId
    ? [...document.querySelectorAll(`[id="${CSS.escape(anchorId)}"]`)]
        .find((el) => el.getClientRects().length > 0) ?? null
    : null;
  ```
  同样修 `Nav.astro:70`（`syncTheme`），并注意：**`/#projects` 直链（导航「项目」、Hero 统计「N 个项目」）在浅色主题下落到 `scrollY=0` 也是同一根因**（实测 `hero #projects link: scrollY 0 → 0`；此为既有问题，但本次 diff 的注释 `Nav.astro:87`「两分支共用 id 可直接映射」与之相悖，且 Hero.astro:14 的注释把统计行定位为 `#projects` 的功能入口，该入口目前点击无效）。建议随本项一并修复。

### R-4 `decodeURIComponent(location.hash.slice(1))` 可抛 `URIError`，中断主题切换

- **位置**：`src/components/Nav.astro:90`
- **类型**：边界状态遗漏 / 崩溃路径
- **说明**：hash 含裸 `%`（如外链 `/#%zz`）时 `decodeURIComponent` 抛异常（Node/浏览器均证实），且该行位于 `dataset.theme = next` **之前**，异常会吞掉本次切换——按钮点了没反应。
- **修复**：

  ```ts
  let anchorId = "";
  if (isHome && location.hash) {
    try { anchorId = decodeURIComponent(location.hash.slice(1)); } catch { anchorId = location.hash.slice(1); }
  }
  ```

---

## P1 — 数据/行为不一致

### R-5 浅色首页「文章」列表只剩 4 行：先 `slice(0,5)` 后过滤

- **位置**：`src/pages/index.astro:28-35`（`recentAll` 先 `.slice(0, 5)`，`recentLight` 再 filter 掉最新小记）；渲染于 `index.astro:72`
- **类型**：逻辑漏洞（边界：最新条目为小记时）
- **实测**：构建产物中深色列表 5 行（含 `/thinkings#留一点空白`），浅色「文章」列表 4 行——第 6 名不回补。注释声称「两主题首页的『最新内容可达集合』必须一致」，实际浅色列表静默缩水一行（该小记经由「随想」区可达，勉强不算丢失，但列表密度与注释承诺不符）。
- **修复**：先 filter 后 slice，保证浅色仍满 5 行：

  ```ts
  const recentAll = [ … ].sort(…);                      // 不 slice
  const take = (arr: typeof recentAll, skip?: string) =>
    arr.filter((i) => i.key !== skip).slice(0, 5);
  <DarkHome recent={take(recentAll)} />
  const recentLight = take(recentAll, `moments/${latestMoment?.id}`);
  ```

### R-6 About 页上线占位文案，且深浅分支内容漂移

- **位置**：`src/pages/about.astro:24`（`这里等待补充。`）；`about.astro:12` 注释仍写「深色分支：dmesg 启动日志」（本 diff 已删 dmesg）
- **类型**：响应式/内容完备性遗漏
- **说明**：① 占位文案会随构建发布；② 浅色分支保留 `learning backend development.` + 新增 intro 段，深色分支两样皆无（本次删了 `dabout__line`），两主题内容不再对位。另外方案 v2 §3 D-2 对 dmesg 是「删 2 留 3、签核前不实施」，本次直接整段删除——若未签核，属越权实施，请对决策记录。
- **修复**：发布前替换占位（或暂时移除该段）；`about.astro:12` 注释同步更新。

---

## P2 — 性能

### R-7 未子集化的 Google Sans 可变字体进入全站正文关键路径

- **位置**：`src/styles/global.css:87-100`（@font-face，无 `unicode-range`）、`global.css:107`（`--font-body` 首位插入 `'Google Sans'`）
- **类型**：性能衰退（有意的设计变更，但代价需明示）
- **量化**：
  - 变更前：`--font-body` 为纯系统栈，notes/thinkings/文章等页面正文 **0 webfont**（仅 mono）。
  - 变更后：全部页面正文命中 Google Sans → 每个页面下载 `GoogleSans-Variable.woff2` **231KB**（无 unicode-range，无法按需加载；斜体文件 235KB 仅在用到斜体时加载）。
  - `dist/` 实测：页面 CSS 合计约 106KB + Google Sans 231KB；移动端首访为最重增量。
- **建议**：对 woff2 做 Latin 子集（pyftsubset，预计可压到 ~30-60KB），或至少接受该增量并记录；`font-display: swap` 已有，FOUT 期间有系统字兜底，不阻塞渲染。

### R-8 `public/fonts/JetBrainsMono-*.woff2` 成为死资产（dist 约 376KB）

- **位置**：`src/styles/global.css:101-102`（注释称「保留作离线兜底」）+ `public/fonts/` 4 个文件
- **类型**：死资产 / 注释失实
- **说明**：`@font-face` 已删，「不挂 @font-face 的兜底」在浏览器语义上不成立——dist 全量检索无任何对 `/fonts/JetBrainsMono*` 的引用，4 个文件（合计 ~376KB）纯属发布体积。
- **修复**：删除 `public/fonts/JetBrainsMono-*.woff2`，注释改为「JetBrains Mono 仅经 @fontsource 加载」。同步清理 R-9 的死依赖。

---

## P3 — 依赖 / 构建 / 死代码

### R-9 两个死依赖留在 package.json

- **位置**：`package.json:19,21`（`@fontsource/fraunces`、`@fontsource/noto-sans-sc`）
- **类型**：依赖风险（本次 diff 删除了全部 import，未删依赖）
- **验证**：`grep -rn "fraunces\|noto-sans-sc" src/` 仅剩注释；`node_modules/@fontsource` 占 80MB。
- **修复**：`npm rm @fontsource/fraunces @fontsource/noto-sans-sc`。字体栈中保留 `'Noto Sans SC'` 名字没问题（系统已装者命中），但 `global.css:184-186`「中文回落 Noto Sans SC」的注释应改为「本地装有 Noto Sans SC 时命中，否则回落系统中黑」。

### R-10 `DarkHomeTerminal.astro` 因删除 `DarkHomeOneline` 而成为孤儿组件

- **位置**：`src/components/dark/home/DarkHomeTerminal.astro`（全仓唯一引用方 `DarkHomeOneline.astro` 本次已删）
- **类型**：死代码
- **说明**：`docs/SPEC.md:92` 本就将其列为「清理待定」；本次删除 Oneline 使 Terminal 彻底无引用（约 15KB 源码）。要么本次一并删除，要么在 SPEC 记录为有意保留。
- **附带**：`package.json` 的 `pb:setup` 指向不存在的 `scripts/pb-setup.mjs`（非本次改动引入，顺带发现）。

### R-11 浏览量数据链路残留半截

- **位置**：
  - `src/lib/pocketbase-loader.ts:243-244`（注释「页面侧由 /api/monostich/views 实时自增」——页面侧消费代码本次已全删，注释失实）
  - `src/content.config.ts:22`（`views` schema 字段已无任何页面读取）
- **类型**：死代码 / 注释漂移
- **修复**：loader 注释改为「构建时快照，当前无页面消费，供未来恢复」或直接删字段（若 PB 侧 `/api/monostich/views` 路由也不再使用，可同步下线）。

---

## P4 — 小问题（顺手修）

| 位置 | 类型 | 问题与修复 |
|---|---|---|
| `src/pages/archive.astro:102,163-164` | 死代码 | 「N 篇内容」节点被永久 `hidden`，`applyFilter` 仍每次写它的 `textContent`。删节点+JS，或去掉 `hidden` 恢复展示，二选一。 |
| `src/components/Nav.astro:160-161` | 自相矛盾样式 | 注释（:144）承诺「brand 位置全程不变」，但移动端仍有 `html[data-nav-compact] .nav__brand { padding-left: 6px }` —— 滚过 80px 后 brand 位移 6px。删该行。 |
| `src/components/Projects.astro:90` | 注释漂移 | 「进行中的项目」→ 状态词已改「可使用」。 |
| `src/styles/dark.css:88` | 冗余规则 | `@media (max-width:640px)` 内 `.thinking-list h2 { font-size: 30px }` 与桌面档（:44，同 30px）完全重复，可删。 |
| `src/pages/index.astro:163-165` | 响应式微瑕 | 移动端 `.recent-row__body` 强制 `grid-row: 2`，实验室行（无 `time`）留出一个 0 高首行 + 6px gap，与文章行头部间距差 2px（实测 delta 30 vs 28）。把 `grid-row` 规则限定在有 `time` 的行（如 `.recent .recent-row` 内），或对 lab 行覆盖回 `grid-row: 1`。 |
| `src/pages/thinkings.astro:114` | a11y 权衡 | `h2 a:focus-visible { …; outline: none; }` 用「变色+下划线变色」替代了全局 2px outline。可用但不稳健（低视力/色弱场景弱），建议保留 `outline: 1px solid var(--accent)` 之类的几何线索。 |

---

## 验证记录

- `npm run build`（含 pagefind postbuild）：**通过**，12 页 + 索引 4 页/445 词。
- 页面结构：深浅分支各渲染 `#projects`/`#recent`（id 重复 ×2，树序深色在前——R-3 根因）。
- 主题切换实测数据、归档搜索态实测数据、Canvas 密度对比（cell 13→9 + 噪点 0.014→0.11，绘制单元 89→351，约 4×；560×300 画布下每帧 fillText 数百次仍廉价，低端移动端建议抽测）见上文各条目。
- Pagefind 清除路径：源码 `node_modules/@pagefind/default-ui/svelte/ui.svelte` 的 `on:click` / Escape 分支均只改 `val`，不派发 `input`。

## 建议合入顺序

1. R-1 + R-2（归档搜索态——当前功能完全没生效）
2. R-3 + R-4（主题切换锚点 + decode 崩溃路径）
3. R-5 / R-6（内容与行为一致性，发布前必须处理 R-6 占位文案）
4. R-7 记录决策；R-8 ~ R-11 清理项一批
5. P4 随手修

---

## 处置记录（2026-09-16 修复轮）

| 项 | 处置 | 位置 |
|---|---|---|
| R-1 | ✅ 已修：补 `.archive__filters[hidden]` / `.archive__groups[hidden] { display:none }` | `archive.astro` 样式 |
| R-2 | ✅ 已修：容器补 `click`（清除按钮）+ `keyup`（Escape）委托监听，rAF 后再同步 | `archive.astro` |
| R-3 | ✅ 已修：新增 `visibleElementById()` 按「有布局盒」解析锚点；切换 handler 与 `syncTheme` 两处接入 | `Nav.astro` |
| R-4 | ✅ 已修：`decodeURIComponent` 包 try/catch，失败退回原始 hash 文本 | `Nav.astro` |
| R-5 | ✅ 已修：`recentSorted` 先 filter 后 slice，浅色列表补足 5 行 | `index.astro` |
| R-6 | ✅ 注释更新 + dmesg 全删经 Aloha 签核确认；**占位文案保留，发布前由 Aloha 本人替换**（唯一遗留待办） | `about.astro:24` |
| R-7 | ⏸ **决策：暂不处理**（Aloha 2026-09-16 确认接受 231KB 全站增量；未来如需优化走 pyftsubset Latin 子集，预计 30-60KB） | — |
| R-8 | ✅ 已删 `public/fonts/JetBrainsMono-*.woff2`（dist 减 ~376KB），global.css 注释修正 | `public/fonts/` |
| R-9 | ✅ 已 `npm rm @fontsource/fraunces @fontsource/noto-sans-sc` | `package.json` |
| R-10 | ✅ 已删 `DarkHomeTerminal.astro`，SPEC.md §6 待确认项闭环 | `dark/home/` |
| R-11 | ♻️ **推翻**：Aloha 决定保留浏览量展示 —— 已按 HEAD 原样恢复 `ArticleLayout` 的 views 展示与客户端自增、两个 `[...slug].astro` 的传参，loader 注释随之复原 | `ArticleLayout.astro` / `notes/[...slug].astro` / `thinkings/[...slug].astro` |
| P4 | ✅ 全部处置：死计数节点+JS 删除；Nav 移动端 brand 6px 位移删除；Projects 注释更新；dark.css ≤640 冗余 h2 规则删除；lab 行移动端空行修复（grid-row 按行类型限定）；thinkings 焦点样式保留 outline | 各文件 |

**R-11 备注**：Aloha 在决策时备注「这个做成 todo，什么情况」——此处说明：views 链路现状是 `content.config.ts` schema 有 `views` 字段、loader 从 PocketBase 拉快照，但本次重构删掉了所有页面的浏览量展示与 `/api/monostich/views` 自增调用，整条链路只剩「拉了不用」。本次只修了注释防止误导；若要彻底清理需删 schema 字段 + loader 赋值，并确认 PocketBase 侧（MonostichPB 仓库）的自定义路由是否下线——涉及另一个仓库，留给你决定后再动。

**回归验证**：`npm run build` 通过；headless Chrome 实测确认 ① 输入搜索词后时间线与筛选 chips 真实隐藏、清空后恢复；② 主题切换 D→L 方向 `#projects` 锚点恢复生效（top≈88，此前 649）；③ 浅色首页「文章」列表 5 行。
