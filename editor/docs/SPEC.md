# SPEC — MonostichEditor 单页文章编辑器

> 版本 v0.1 · 状态：待评审
> 关联需求：`../ISSUE-article-editor.md`、本 issue（ByteMD + PocketBase 单页编辑器）

## 1. 背景与目标

摆脱「写文 → 提交 Git → CI → 部署」链路。做一个超轻量级单页（Headless）Markdown
编辑器，直连 PocketBase REST 完成登录、存草稿、传图、发布，发布即生效。

- **单作者、单账号**：不做多用户、权限、文章列表/仪表盘。
- **数据零迁移**：`articles.content` 保持原始 Markdown，与现有 loader 完全同源。
- **可长期自维护**：只依赖活跃主流库，构建产物为纯静态文件。

## 2. 范围

### In scope
- 独立单页 SPA：挂在 `admin.monostich.cloud/editor/` 一个页面，编辑 + 预览 + 元信息 + 登录。
- 鉴权（`editors` 集合密码登录，token 持久化）。
- ByteMD 双栏编辑（GFM / 代码高亮 / 数学公式）。
- 图片粘贴/拖拽上传至文章 `attachments`，自动回填 PB 文件 URL。
- 元信息表单与「存草稿 / 立即发布」。
- `?id=<recordId>` 载入既有文章回显与覆写。

### Out of scope（本期不做）
- 文章列表页、搜索、删除、回收站。
- 封面上传（`cover` 字段本期不在编辑器暴露）。
- Astro 前台改浏览器端动态拉取（已确认缓做；本期「发布」只保证数据库即时更新）。
- PocketBase schema / hooks 任何修改。
- 移动端深度适配（保证可用即可，桌面优先）。

## 3. 架构总览

```
浏览器
   │
   ▼  https://admin.monostich.cloud
┌─────────────────────────────────────────────┐
│ nginx → PocketBase :8090                     │
│   /api/**        PocketBase REST             │
│   /api/files/**  PocketBase 文件             │
│   /_/            PocketBase 自带后台（保留） │
│   /editor/**     本 SPA（pb_public/editor/） │
└─────────────────────────────────────────────┘
```

- SPA 为**纯静态产物**（Vite build），部署到服务器 PocketBase 的
  `pb_public/editor/` 目录，由 PocketBase 自带静态文件服务托管。
- 与 API **同源**，无 CORS 问题，nginx 配置零改动。
- 请求地址默认同源（`window.location.origin`），可用
  `VITE_PB_BASE_URL=http://127.0.0.1:8090` 覆盖以便本地开发
  （本地开发走 Vite dev server 代理 `/api`，避免本地 CORS）。

## 4. 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 构建 | Vite + TypeScript | 主流、快、产物纯静态 |
| 框架 | React 18 | ByteMD 官方 `@bytemd/react` 封装最成熟 |
| 编辑器 | `bytemd` + `@bytemd/react` | 掘金同款，Markdown 一等公民，双栏同步滚动内置 |
| 插件 | `@bytemd/plugin-gfm`、`@bytemd/plugin-highlight`、`@bytemd/plugin-math`（+`@bytemd/plugin-breaks` 可选） | 与博客端 remark-math/rehype-katex 对齐 |
| PB 客户端 | `pocketbase`（官方 JS SDK） | authStore 自动持久化/刷新、文件上传封装好 |
| 样式 | 手写 CSS（单文件） | 页面只有一个，不引 UI 框架 |
| 包管理 | npm | 与 MonostichBlog 一致 |

无路由库：仅一个页面，`?id=` 用 `URLSearchParams` 读。

## 5. 数据契约（对接现有 `articles` 集合）

| 表单字段 | PB 字段 | 说明 |
|---|---|---|
| 标题 | `title` | moments 可为空 |
| Slug | `slug` | 留空时由 PB `autogeneratePattern` 生成（`[a-z0-9]{15}`）；notes/thinkings 建议必填校验放前端 |
| 类型 | `type` | `notes` / `thinkings` / `moments`，单选 |
| 状态 | `status` | 只由动作按钮写入：`draft` / `published`（`archived` 不在 UI 暴露） |
| 标签 | `label` | 单值文本 |
| 摘要 | `summary` | 文本 |
| 发布时间 | `publishedAt` | datetime-local；发布时若为空自动填当前时间 |
| 正文 | `content` | 原始 Markdown |
| 附件 | `attachments` | 编辑器图片上传的目标字段（≤20 个/篇） |
| — | `editedAt` | 每次保存/发布时前端写当前时间 |

**图片 URL 契约（关键）**：正文中的图片必须是
`{PB_BASE}/api/files/articles/{recordId}/{storedName}` 形式 —— 前台
`pocketbase-loader.ts` 按此正则识别并物化图片。禁止手写其他形式。

## 6. 功能详设

### 6.1 鉴权与登录拦截
- 进入页面检查 `pb.authStore.isValid`；无效则显示登录弹窗（邮箱 + 密码），
  弹窗不可关闭（无其他匿名内容）。
- 登录调 `POST /api/collections/editors/auth-with-password`（SDK：
  `pb.collection('editors').authWithPassword()`），token 由 SDK 存入
  localStorage，后续请求自动携带。
- 任意请求返回 401 → 清空 authStore → 回到登录弹窗。
- 右上角提供「退出登录」。

### 6.2 ByteMD 编辑器
- `mode: "split"`（左编辑右预览），`placeholder` 提示。
- 插件：gfm（表格/任务列表/删除线）、highlight（代码高亮）、
  math（行内/块级公式，预览用 KaTeX）。
- 主题：跟随系统 `prefers-color-scheme`，编辑器区与整体暗色/亮色调一致；
  单页内不引全站样式。
- 编辑区占满主区域，元信息为顶部可折叠横条（默认展开，编辑时专注正文）。

### 6.3 图片上传（粘贴 / 拖拽）
实现 ByteMD `uploadImages(files)` 钩子：

1. **确保记录存在**：若当前文章尚无 `id`（新建未保存），先以当前表单 +
   `status="draft"` 静默 `POST` 创建记录（slug 留空让 PB 生成），取回 `id`。
2. **上传**：`FormData` 追加 `attachments+=<file>`（PB 语法：`attachments` 字段
   multipart 追加），`PATCH /api/collections/articles/records/{id}`。
3. **回填**：响应里的 `attachments` 数组取新文件**存储名**（原名会被 PB 加随机
   后缀），返回 `[{ url: "{PB}/api/files/articles/{id}/{storedName}", alt: 原名 }]`
   给 ByteMD，自动插入 `![](url)`。
4. 失败时编辑器内 toast 报错，不阻塞正文输入。

> 限制提示：attachments 上限 20 个/篇、单篇正文 200000 字符（现有 schema）。

### 6.4 元信息表单与动作区
顶部横条：标题、Slug、类型（三选一 segmented）、标签、摘要、发布时间；
右侧动作区：

- **存草稿**：有 id → `PATCH`；无 id → `POST`；写 `status="draft"`。
- **立即发布**：同上，写 `status="published"`；`publishedAt` 为空时补当前时间。
- 保存/发布成功 toast + 更新地址栏 `?id=`（`history.replaceState`，
  便于刷新/复制链接继续编辑）。
- 脏状态跟踪：有未保存改动时标题栏显示 ●，`beforeunload` 提示。

### 6.5 已有文章载入
- `?id=<recordId>`：`GET /api/collections/articles/records/{id}`，全字段回显
  （含 `status`，发布按钮文案随状态变为「更新发布」）。
- id 不存在或无权限 → 错误提示 + 停留在空表单。

## 7. 错误与边界

| 场景 | 行为 |
|---|---|
| 401 | 清 token → 登录弹窗 |
| 网络失败/5xx | toast 报错，内容不丢（正文始终在内存） |
| slug 冲突（unique 索引 `(type, slug)`） | 把 PB 400 的字段错误提示在 Slug 输入框旁 |
| 上传超限/类型不符 | toast 显示 PB 返回的校验信息 |
| token 过期（5 天有效期） | 同 401 处理 |

## 8. 部署

1. **仓库**：编辑器源码在 MonostichBlog 仓库 `editor/` 子目录（与博客同仓库）。
2. **CI**：push 到 `main` 触发 MonostichBlog 的 `deploy.yml`，依次构建博客与
   编辑器（`vite build`，`base: '/editor/'`，产物 `editor/dist/`）。
3. **发布**：编辑器产物解到服务器 `/opt/monostich/pb/editor-releases/<sha>`，
   再原子切换软链 `/opt/monostich/pb/pb_public/editor` → 该 release。
   PocketBase 原生托管 `pb_public`，无需重启、无需改 nginx。
4. **访问**：`https://admin.monostich.cloud/editor/`；PocketBase 自带
   后台仍在 `/_/` 不受影响。
5. **本地开发**：`cd editor && npm run dev`，Vite 配置 `server.proxy` 把 `/api`
   代理到 `http://127.0.0.1:8090`（同源假象，无 CORS）。

## 9. 依赖与已确认决策

- 前台博客「发布即见」依赖 Astro 端改为运行时拉取（`ISSUE-article-editor.md`
  第 2 节），**已确认缓做、单独立项**；本期「发布」仅保证数据库即时更新。
- 已确认（2025-xx 评审）：
  - Q1 部署位置：`admin.monostich.cloud/editor/`（`pb_public`），不开新子域；
  - Q2 同源部署，无 CORS 改动；
  - Q4 不做封面上传；
  - Q5 前台动态化缓做。

## 10. 验收标准（DoD 映射）

| # | 验收项 | 对应实现 |
|---|---|---|
| 1 | 管理员登录并保持鉴权 | §6.1 |
| 2 | 双栏实时渲染，代码块/扩展语法正常 | §6.2 |
| 3 | 拖拽/粘贴图片无感上传并正确预览 | §6.3 + §5 URL 契约 |
| 4 | 发布后 PB 记录即时更新，前台可拉取 | §6.4（前台动态化为后续项） |
