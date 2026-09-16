# MonostichBlog Design Audit & Fix Plan

> 审计日期：2026-09-14
> 范围：源码（global.css / dark.css / 全部页面与组件）+ 本地实跑页面（浅色 / 深色 / 移动端，1440px 与 390px）
> 已含作者 5 项拍板（见文末「决策映射」）

---

## 总体判断

Monostich 已形成真实的「双生系统」：

- **浅色 = 编辑排版（Editorial）**：留白、克制栅格、Fraunces 衬线大标题、下划线 / 方括号命令式链接、几乎无框无卡
- **深色 = 信号控制台（Signal Console）**：JetBrains Mono、磷光琥珀、gutter 行号、`//` 注释式模块头、WebGL 信号核、活体终端

**浅色是「纸」，深色是「屏」。** 问题不在「不够设计」，而在少量断链 / 死代码、浅深语言未对齐、深色首页高光堆叠。

---

## Part 1 · 问题清单

> 分级：P0 = 破坏功能/阅读/导航；P1 = 明显信息噪声 / 层级 / 不一致 / 重复；P2 = 细节 polish
> 处置动词：Keep 保留 / Remove 删除 / Merge 合并 / Reduce 降存在感 / Adjust 调整

### P0

#### 1. 深色导航「Work」断链
- **Page/Component**: `Nav.astro:68-72` + `components/dark/home/DarkHomeWork.astro:17`
- **Current**: 深色下 Nav 把项目链接改写为 `/#projects-dark`；首页深色分支真实锚点是 `id="projects"`。`projects-dark` 仅存在于无 import 的 `DarkProjects.astro`
- **Problem**: 断链。深色首页点「Work」浏览器找不到锚点，不滚动
- **Why**: 深色首页重构把锚点统一回 `projects`，Nav 改写逻辑未跟上
- **User Impact**: 深色首页主导航核心功能失效
- **Recommendation**: 删除 Nav 中改写为 `/#projects-dark` 的逻辑（含 hash 同步分支），深浅统一 `/#projects`
- **Adjust** · Code Layer: Shared Component（Nav）

---

### P1

#### 2. 深色首页项目卡网格与同页 gutter 语言断裂
- **Page/Component**: `DarkHomeWork.astro`
- **Current**: 项目 = 2×2 带边框卡片（P.01 编号 + 状态灯 + 扫描线 hover）；文章/实验室 = 行号 gutter 列表
- **Problem**: 「Section = Card」反模式；同页两种结构语言
- **Why**: 项目信息（名/述/状态/标签）完全可用 gutter 行表达
- **User Impact**: 首页后半段视觉噪音骤增
- **Recommendation**: 改为与 `DarkHomeRecent` / `DarkHomeLab` 同构 gutter 列表；状态灯作行内右侧元素保留
- **Merge** · Code Layer: Shared Component

#### 3. 浅色 Hero pill CTA 与全站命令式语言不一致
- **Page/Component**: `Hero.astro:56`
- **Current**: 蓝色实心胶囊按钮（radius 24px + 填充）
- **Problem**: 全站浅色按钮哲学是 `.btn` 的 `[ ... ]` 方括号命令式，此为孤例
- **User Impact**: 第一印象页用了「最不 Monostich」的控件
- **Recommendation**: 改为 `[ 关于我 ]` 命令式按钮（复用 `.btn--primary`）
- **Adjust** · Code Layer: Shared Component

#### 4. 深浅 About 信息不一致
- **Page/Component**: `DarkAbout.astro:43-50` vs `about.astro:23-32`
- **Current**: 浅色只有 email/github；深色多 `stack` / `now`
- **Problem**: 同一内容两主题应都能找到（原则 2）
- **User Impact**: 浅色访客对 Aloha 的了解少一块
- **Recommendation**: 深浅统一只留 email/github（作者决定，后期再补内容）
- **Adjust** · Code Layer: Content

#### 5. 移动端项目区过度轮播化
- **Page/Component**: `Projects.astro:40-44, 83-129`
- **Current**: 移动端（≤700px）变 scroll-snap 横向轮播 + 一对圆形 Chevron 按钮 + 滚动条
- **Problem**: 4 个项目引入重量级轮播；圆按钮是全场唯一 filled-circle control
- **User Impact**: 认知成本高于收益
- **Recommendation**: 移动端改与桌面同结构竖向堆叠（名/述/状态），删除 `.work-controls` 与 scroll-snap
- **Remove**（轮播）/ **Adjust**（竖排）· Code Layer: Shared Component

#### 6. 深色首屏/次屏高光时刻堆叠
- **Page/Component**: `DarkHomeHero.astro` / `DarkHomeOneline.astro` / `DarkHomeTerminal.astro`
- **Current**: 首屏 = 信号核 + 磁力标题 + 视差 + 滚动提示 + 星图连线；次屏 = 玻璃 spotlight 卡 + 活体终端
- **Problem**: 两处各自是「全场最佳」，背靠背互相稀释
- **User Impact**: 记住「很炫」而非「某处很妙」
- **Recommendation**: 保留终端（真实人格），降级玻璃卡——删 spotlight 光斑与顶部高光，保留玻璃本体；信号核独占首屏、终端独占次屏
- **Reduce** · Code Layer: Shared Component（DarkHomeOneline）

---

### P2

#### 7. 深色 Thinkings 卡片序号
- **Page/Component**: `thinkings.astro:75` + `dark.css:50`
- **Current**: 深色下 thinking 卡右上角显示 `02`、`03` 序号
- **Problem**: 非 Top N、不参与导航，gutter 审美惯性延伸；语境是「逛」
- **Recommendation**: 删除 `.thinking__number` 及深色显示规则（作者已拍板）
- **Reduce** · Code Layer: Page

#### 8. 深色 About `~ exit 0`
- **Page/Component**: `DarkAbout.astro:53`
- **Problem**: 纯装饰，与 dmesg 语义重复；About 页 terminal 词汇已高密度
- **Recommendation**: 删除；保留 dmesg 与像素解体画布
- **Reduce** · Code Layer: Page

#### 9. Notes / Archive 行尾 ↗
- **Page/Component**: `notes.astro:31`、`archive.astro:115`
- **Problem**: 整行已是链接且 hover 有反馈；箭头非外链语义，成排出现构成规律噪音
- **Recommendation**: 删除 `note__arrow` / `archive__arrow`
- **Remove** · Code Layer: Page

#### 10. Hero 死参数 logPaths
- **Page/Component**: `Hero.astro:5` + `index.astro:40-49`
- **Problem**: `index.astro` 组装的带权重 `logPaths` 传入但 `Hero` 不消费（LogStream 移除后的尾巴）
- **Recommendation**: 删除组装与传参
- **Remove** · Code Layer: Page

#### 11. 浅色 recent/lab 重复节点 recent-list__desc
- **Page/Component**: `index.astro:88-91`
- **Problem**: summary 在 DOM 写两遍，靠 CSS 决定出场；`recent-list__desc` 浅色下 `display:none` 已是死节点
- **Recommendation**: 删除该节点
- **Remove** · Code Layer: Page

#### 12. Lab `kind` 框不一致
- **Page/Component**: `lab/index.astro:60` vs `DarkHomeLab.astro:88`
- **Current**: 浅色 Lab 页 kind 纯文本；深色首页 Lab kind 带边框
- **Recommendation**: 统一无框文本，用色不用框
- **Adjust** · Code Layer: Shared Component

#### 13. TOC 折叠断点不一致
- **Page/Component**: `ArticleLayout.astro:407` vs `dark.css:76`
- **Current**: 浅色 1279px / 深色 800px 各自掉正文上方
- **Recommendation**: 统一折叠断点（左右位置可不同，折叠时机一致）
- **Adjust** · Code Layer: Layout

#### 14. h1 字族/尺寸三处硬编码
- **Page/Component**: `global.css:297` / `dark.css:18,60` / `ArticleLayout.astro:307`
- **Problem**: 列表页/文章页 h1 的 Fraunces↔mono 与 44/56px 散落三处，注释互相引用
- **Recommendation**: 抽主题级 token，页面只引用
- **Adjust** · Code Layer: Token

#### 15. 死代码组件
- **Page/Component**: `src/components/DarkProjects.astro`、`DarkHome.astro`、`DarkHero.astro`、`HeroGlow.astro`、`LogStream.astro`
- **Problem**: 均无 import 来源，被 `components/dark/` 新分支取代
- **Recommendation**: 确认后删除
- **Remove** · Code Layer: Shared Component

---

## Part 2 · 修复计划

### 决策映射（作者已拍板）
| 审计项 | 决定 |
|---|---|
| Footer 写作/管理入口 | **保留，不动** |
| 深色 Thinkings 序号 | **删** |
| 深色 About 像素解体画布 | **保留** |
| About 信息 | **深浅都只留 email/github**（深色删 stack/now，后期再补） |
| 深色首页玻璃卡 | **降级** |

### 执行清单（按优先级）

**P0**
1. 修深色导航 Work 断链 — `Nav.astro`

**P1**
2. 深色项目区 gutter 化 — `DarkHomeWork.astro`
3. 浅色 Hero CTA 改命令式 — `Hero.astro`
4. About 深浅对齐为 email/github — `DarkAbout.astro`
5. 移动端项目区去轮播化 — `Projects.astro`

**P2**
6. 删深色 Thinkings 序号 — `thinkings.astro` + `dark.css`
7. 删深色 About `~ exit 0` — `DarkAbout.astro`
8. 删 Notes/Archive 行尾 ↗ — `notes.astro` / `archive.astro`
9. 深色玻璃卡降级 — `DarkHomeOneline.astro`
10. 删死参数 logPaths — `index.astro`
11. 删浅色 recent-list__desc 重复节点 — `index.astro`
12. 统一 Lab kind 无框 — `DarkHomeLab.astro`
13. TOC 折叠断点统一 — `ArticleLayout.astro` + `dark.css`
14. 死代码清理 — 5 个旧组件
15. h1 字族/尺寸收拢 Token — `global.css` + `dark.css` + `ArticleLayout.astro`

### 不做的事（保护作者人格）
- 不动 Footer（写作/管理保留）
- 不动 About 现有结构（深浅都只留 email/github，内容等后期补）
- 不动深色像素解体画布、dmesg、信号核、活体终端、scramble、`// 编号` 模块头、`[ ]` 命令式按钮、Thinkings 混排流

### 验证闭环
1. dev server（`http://localhost:4322/`）逐项复查：
   - 深色首页 Work 锚点可滚动定位
   - 浅色 Hero CTA 语言统一
   - 移动端项目竖排无轮播
   - 深浅 About 一致（email/github）
   - 深色玻璃卡降级效果
2. `npm run build` 无报错
