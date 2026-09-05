# Monostich 首屏 Hero Spec

## 1. 目标

首屏需要在 3 秒内传达三件事：

1. 这是一个个人技术记录空间。
2. 内容主题包含代码、实验、想法与项目。
3. 页面具有持续运行的终端系统感，但内容本身优先于装饰效果。

## 2. 设计方向

- 方向：Editorial Terminal / 编辑型终端
- 气质：安静、克制、略带实验性
- 视觉原则：标题是第一焦点，状态面板是第二焦点，日志与辉光只负责营造环境
- 关键词：monospace、editorial、phosphor amber、quiet system、field notes

## 3. 首屏信息层级

```text
L1  主标题：explore / and build.
L2  说明：个人站点定位 + 中文介绍
L3  行动：阅读最新文章 / 浏览全部内容
L4  状态：域名、在线状态、内容数量、更新时间
L5  氛围：访问日志、辉光、光标、LED
```

任何背景效果都不得超过 L1–L3 的对比度和可读性。

## 4. 桌面端布局

### 容器

- 最大宽度：`1200px`
- 页面左右内边距：`clamp(20px, 5vw, 64px)`
- Hero 最小高度：`min(820px, 88vh)`
- 导航高度：保持现有 `59px`

### 内容定位

- 顶部 colophon：Hero 顶部 `32px`
- 内容区：距离 Hero 顶部约 `30–36vh`
- 标题区底部：Hero 底部 `10–12vh`
- 状态卡：右侧对齐容器，距离底部 `12vh`
- 状态卡与标题最小水平间距：`96px`

### 网格

```text
左侧内容：8 columns
右侧状态：3 columns
中间空隙：1 column
```

## 5. 移动端布局

- 断点：`600px`
- Hero 高度：`82vh`
- 标题字号：`clamp(2.8rem, 14vw, 4.2rem)`
- 状态卡改为底部横向信息条
- 日志只保留首屏上方约 25% 区域
- CTA 允许换行，但每个可点击区域至少 `44px` 高
- 不出现横向滚动

## 6. 文字规格

### Eyebrow

```text
// personal field notes · 2026
```

- JetBrains Mono
- `12px`
- 字距 `0.04em`
- 颜色 `--accent`

### 主标题

```text
explore
and build._
```

- JetBrains Mono 500
- 桌面端：`clamp(3.3rem, 8vw, 6.7rem)`
- 移动端：`clamp(2.8rem, 14vw, 4.2rem)`
- 行高：`0.98`
- 字距：`-0.045em`
- 颜色：深色主题 `#e6e7ea`，浅色主题 `--text`

### 中文介绍

```text
写代码、做实验，也记录那些尚未成形的想法。
```

- 中文衬线字体
- `18px`
- 行高 `1.7`
- 最大宽度 `25ch`
- 颜色 `--text-muted`

## 7. CTA 规格

```text
阅读最新文章 ↗
浏览全部内容 ↗
```

- 不使用实体按钮背景
- JetBrains Mono `12px`
- 默认颜色 `--text-muted`
- Hover 颜色 `--text`
- 箭头使用 `--accent`
- Hover 时箭头向右上方移动 `3px`
- 两个 CTA 间距：`24px`

## 8. 状态面板规格

内容：

```text
monostich.cloud
● online

notes       05
projects    08
updated     09.05
```

- 宽度：`210px`
- 内边距：`18px`
- 边框：`1px solid var(--border)`
- 背景：`color-mix(in srgb, var(--surface) 68%, transparent)`
- 不使用明显阴影
- 标签颜色：`--text-faint`
- 数值颜色：`--text-muted`
- 在线状态和 LED 使用 `--accent`

## 9. 背景效果预算

### LogStream

- 只作为氛围层，不进入标题字形区域
- 首次加载最多 3–5 行
- 默认透明度约为当前版本的 60–70%
- 桌面端高度不超过 Hero 的 42%
- 移动端高度不超过 Hero 的 25%

### HeroGlow

- 只在右上或状态面板后方形成局部光源
- 默认透明度：`0.18–0.22`
- 标题背后保持低噪声背景
- 浅色主题不显示动态 WebGL

### 动画

- 标题解码：保留现有 FlickerTitle
- CTA：仅做颜色和箭头位移
- LED：低频闪烁
- `prefers-reduced-motion` 下冻结日志、辉光和光标动画

## 10. 验收标准

- 首屏第一眼焦点是标题，而不是日志或辉光
- 桌面端 1440px 下标题和状态卡同时可见
- 移动端 375px 下无横向滚动
- 标题、中文介绍、CTA 的阅读顺序自然
- 深色主题正文对比度至少 4.5:1
- 所有 CTA 和主题按钮具备可见 focus 状态
- WebGL 不可用时布局仍完整
- 低性能设备不会因为背景动画影响内容阅读

## 11. 实施计划

### Phase 1：结构调整

1. 调整 Hero DOM 顺序：eyebrow → 标题 → 中文介绍 → CTA。
2. 增加状态面板组件或 Hero 内部 aside。
3. 设置桌面端和移动端布局骨架。

### Phase 2：视觉层级

1. 调整标题字号、行高和位置。
2. 降低 LogStream 与 HeroGlow 的不透明度。
3. 统一 colophon、状态卡和 CTA 的等宽字体规则。

### Phase 3：交互与无障碍

1. 检查 CTA 的键盘 focus 和触控尺寸。
2. 检查 reduced-motion 行为。
3. 检查状态面板的语义标签和屏幕阅读顺序。

### Phase 4：验证

1. 在 375px、600px、1024px、1440px 宽度检查布局。
2. 检查深色和浅色主题。
3. 验证 WebGL 关闭、慢设备和无 JavaScript 情况。
4. 重新启动 Astro 预览并进行截图对比。

## 12. 当前阻塞

- `.git/refs` 当前不可写，无法创建新的 Git 分支。
- Astro 内容同步依赖 `127.0.0.1:8090` 的 PocketBase，当前连接被环境拒绝，因此暂时只能使用静态预览文件检查视觉方向。

## 13. 交接给实现模型的上下文

### 技术栈

- Astro 5
- 原生 CSS，样式主要位于组件 `<style>` 中
- 页面入口：`src/pages/index.astro`
- Hero 组件：`src/components/Hero.astro`
- 导航组件：`src/components/Nav.astro`
- 全局 token：`src/styles/global.css`
- 日志背景：`src/components/LogStream.astro`
- WebGL 辉光：`src/components/HeroGlow.astro`
- 标题解码：`src/components/FlickerTitle.astro`

### 不要改变的内容

- 不要重写 `LogStream`、`HeroGlow` 或 `FlickerTitle` 的核心脚本。
- 不要移除现有深色 / 浅色主题切换。
- 不要改变导航的 URL 和 `aria-current` 行为。
- 不要引入新的 UI 框架或第三方组件库。
- 不要把站点改成卡片化 SaaS 风格、渐变营销页或大面积实心按钮。
- 不要使用 emoji 作为图标。

## 14. 建议的 DOM 结构

实现模型应尽量将 `Hero.astro` 调整为以下语义结构。类名可以沿用，也可以按同等语义替换：

```astro
<header class="hero">
  <HeroGlow />
  <LogStream paths={logPaths} />

  <div class="hero__colophon container">
    <p class="hero__shell">
      <span class="hero__prompt">aloha@monostich</span>
      <span class="hero__sep">:</span>
      <span class="hero__path">~</span>
      <span class="hero__dollar">$</span>
    </p>
    <p class="hero__system">
      <span class="hero__led" aria-hidden="true"></span>
      system online
    </p>
  </div>

  <div class="hero__inner container">
    <p class="hero__eyebrow">// personal field notes · 2026</p>
    <h1 class="hero__title">
      <span class="hero__line">
        explore<br />and build.<FlickerTitle />
        <span class="hero__cursor" aria-hidden="true">_</span>
      </span>
    </h1>
    <p class="hero__intro" lang="zh-CN">
      写代码、做实验，也记录那些尚未成形的想法。
    </p>
    <nav class="hero__actions" aria-label="Hero actions">
      <a href="/notes">阅读最新文章 <span aria-hidden="true">↗</span></a>
      <a href="/archive">浏览全部内容 <span aria-hidden="true">↗</span></a>
    </nav>
  </div>

  <aside class="hero__status" aria-label="Site status">
    <p class="hero__status-label">monostich.cloud</p>
    <p class="hero__status-state">
      <span class="hero__led" aria-hidden="true"></span>online
    </p>
    <dl class="hero__metrics">
      <div><dt>notes</dt><dd>{notesCount}</dd></div>
      <div><dt>projects</dt><dd>{projectsCount}</dd></div>
      <div><dt>updated</dt><dd>{updatedLabel}</dd></div>
    </dl>
  </aside>
</header>
```

如果目前页面没有可直接传入的统计数据，先使用稳定的静态值；不要在客户端额外发请求。后续可将 `notesCount`、`projectsCount` 和 `updatedLabel` 替换为服务端计算值。

## 15. CSS 实现约束

### Hero 根节点

```css
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: min(820px, 88vh);
  overflow: clip;
  isolation: isolate;
}
```

`overflow: clip` 只在项目浏览器支持范围内使用；如需兼容，可降级为 `hidden`。不能产生横向滚动条。

### 内容层级

```css
.hero__colophon,
.hero__inner,
.hero__status { position: relative; z-index: 1; }
.hero__inner { margin-top: auto; padding-bottom: 11vh; }
```

背景层必须保持在 `z-index: 0`，不能使用高于内容层的固定定位元素覆盖标题。

### 标题

```css
.hero__title {
  max-width: 8ch;
  color: var(--text);
  font-family: var(--mono);
  font-size: clamp(3.3rem, 8vw, 6.7rem);
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 0.98;
}
```

标题不应使用文字渐变、描边或强烈 text-shadow。可保留现有解码动画和光标闪烁。

### 状态卡

桌面端：

```css
.hero__status {
  position: absolute;
  right: max(var(--page-gutter), calc((100vw - var(--maxw)) / 2));
  bottom: 12vh;
  width: 210px;
  padding: 18px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 68%, transparent);
  font-family: var(--mono);
  font-size: 11px;
}
```

状态卡不能挡住标题、CTA 或导航；在 1024px 宽度下如果空间不足，应提前切换为底部横向布局，而不是挤压标题。

### 断点

- `> 1100px`：标题与状态卡并置。
- `601–1100px`：状态卡宽度缩为 `180px`，标题最大宽度保持不变。
- `≤ 600px`：状态卡改为普通文档流元素，位于 CTA 之后或 Hero 底部。
- `≤ 420px`：CTA 纵向排列；状态数据允许缩写为 `notes 05 · projects 08 · 09.05`。

## 16. 内容与数据规则

- Eyebrow 使用英文，保持终端注释感。
- 主标题保持英文，不添加额外标点或营销副标题。
- 中文介绍最多两行，不能超过 `25ch`。
- CTA 文案保持动作导向，不使用“了解更多”等泛化词。
- 状态面板中的数字应该是可信的；如果使用静态占位值，要在后续实现中集中替换。
- 不在 Hero 中展示文章摘要、标签云、社交链接或多组统计。

## 17. 动画与性能规则

- 首屏进入动画总时长不超过 `1600ms`。
- Hero 首屏不得使用 scroll-scrub 或持续位移动画。
- LogStream 在不可见、切后台和浅色主题下应停止渲染，沿用现有生命周期逻辑。
- HeroGlow 默认透明度控制在 `0.18–0.22`，不可使用 debug 强度作为默认值。
- 所有持续动画必须在 `prefers-reduced-motion: reduce` 下停止或冻结。
- 不新增定时器、IntersectionObserver 或 requestAnimationFrame 管线，除非能复用现有实现。
- 标题初始状态必须在无 JavaScript 时仍可见。

## 18. 验证步骤

实现完成后按以下顺序检查：

1. `npm run build`，确认 Astro 编译无新增错误。
2. 启动 `npm run dev -- --host 127.0.0.1`。
3. 使用桌面宽度 1440×900 检查首屏主次关系。
4. 使用 1024×768 检查状态卡是否遮挡标题。
5. 使用 768×1024 检查中等宽度布局是否出现拥挤。
6. 使用 375×812 检查标题、CTA、状态条和导航是否溢出。
7. 切换深色 / 浅色主题，检查背景和文字对比度。
8. 开启 `prefers-reduced-motion`，确认日志、辉光、光标不会持续运动。
9. 关闭 WebGL 或模拟不支持 WebGL，确认标题和状态信息仍完整。
10. 用键盘 Tab 访问 CTA 和主题按钮，确认 focus ring 清晰可见。

## 19. 交付内容

实现模型最终应提供：

- 修改后的 `src/components/Hero.astro`
- 如确有必要，修改后的 `src/styles/global.css`
- 一张桌面端首屏截图
- 一张移动端首屏截图
- `npm run build` 的结果
- 简短说明：改了哪些视觉层级、如何处理响应式、是否保留现有动画
