# PLAN — MonostichEditor 单页文章编辑器

> 关联设计：`./SPEC.md`（v0.1，待评审）
> 原则：每步产出可验证；先骨架后功能；不做范围外改动。

## 里程碑总览

```
M1 工程骨架        → 可构建、可部署的空白 SPA
M2 鉴权闭环        → 登录/保持/退出/401 拦截
M3 编辑核心        → ByteMD 双栏 + 插件 + 主题
M4 图片上传        → 粘贴/拖拽 → PB attachments → 回填 URL
M5 元信息与发布流  → 表单 + 存草稿/发布 + ?id 载入覆写
M6 部署与联调      → Pages + CORS + 端到端验收
```

---

## M1 工程骨架

**目标**：`npm run dev` 起页面，`npm run build` 出静态产物。

- [ ] 在 `monostich/MonostichEditor/` 初始化 Vite + React + TS 工程
  - `npm create vite@latest MonostichEditor -- --template react-ts`
- [ ] 依赖：`bytemd @bytemd/react @bytemd/plugin-gfm @bytemd/plugin-highlight @bytemd/plugin-math pocketbase`
- [ ] `vite.config.ts`：`base: '/editor/'`（部署在 `pb_public/editor/`）；
  `server.proxy`：`/api` → `http://127.0.0.1:8090`（本地开发同源假象，免 CORS）
- [ ] `src/lib/pb.ts`：导出 `pb = new PocketBase(import.meta.env.VITE_PB_BASE_URL ?? '')`
  （默认同源，即 `window.location.origin`；本地开发由 Vite 代理转发 `/api`）
- [ ] `.env.development`：留空或注释说明走代理；如需直连可设 `VITE_PB_BASE_URL`
- [ ] 单页 HTML 骨架：顶栏（站名/用户区）+ 元信息条 + 编辑区占位
- [ ] 验收：`npm run build && npm run preview` 页面可开

## M2 鉴权闭环

- [ ] `src/lib/auth.ts`：`useAuth()`（订阅 `pb.authStore.onChange`）
- [ ] `LoginDialog` 组件：邮箱+密码 → `pb.collection('editors').authWithPassword(identity, password)`；错误提示
- [ ] 入口守卫：`pb.authStore.isValid === false` → 强制显示登录弹窗
- [ ] `pb.beforeSend` / 响应拦截：401 → `pb.authStore.clear()` 回登录态
- [ ] 顶栏「退出登录」按钮
- [ ] 验收：错误密码报错；正确登录刷新后仍登录；退出后回到弹窗

## M3 编辑核心

- [ ] `src/components/MdEditor.tsx`：`<Editor value onChange plugins mode="split" uploadImages={...}/>`
- [ ] 引入 `bytemd/dist/index.css` + `highlight.js` 主题 + `katex/dist/katex.min.css`
- [ ] 主题适配：`prefers-color-scheme` 切换亮/暗 CSS 变量
- [ ] 正文本地 state：`content` 变更即同步 ByteMD
- [ ] 验收：表格/任务列表/代码块/`$x^2$` 公式在右栏渲染正确；左右滚动同步

## M4 图片上传（契约敏感）

- [ ] `src/lib/upload.ts`：`uploadImages(files, ctx)` 实现
  - [ ] 无 `id` 时先静默 `POST /api/collections/articles/records` 建草稿取 `id`（slug 留空交给 PB autogenerate）
  - [ ] `FormData.append('attachments', file)` → `PATCH .../records/{id}`（`pb.collection('articles').update(id, formData)`）
  - [ ] 从响应 `attachments` 计算新增存储名，返回 `[{ url: \`${PB}/api/files/articles/${id}/${stored}\`, alt }]`
- [ ] 将 hook 接入 ByteMD `uploadImages` prop
- [ ] toast 错误提示；失败不丢正文
- [ ] 验收：粘贴截图/拖入图片 → 右栏即时显示；正文插入的 URL 形如 `/api/files/articles/<id>/<storedName>`；PB 记录 `attachments` 含新文件

## M5 元信息与发布流

- [ ] `MetaBar` 组件：title/slug/type/label/summary/publishedAt 受控表单
- [ ] `dirty` 状态：任一字段/content 变更置脏；标题栏 ●；`beforeunload` 拦截
- [ ] `save('draft')` / `save('published')`
  - [ ] 有 id → `PATCH`；无 id → `POST`
  - [ ] 发布时 `publishedAt` 为空补当前；每次保存写 `editedAt=now`
  - [ ] 成功后 `history.replaceState` 写 `?id=`；toast 成功；清脏
- [ ] 载入：`?id=` → `pb.collection('articles').getOne(id)` 全字段回显；失败提示
- [ ] slug 冲突：捕获 400，把 PB 返回的 `data.slug.message` 标在输入框旁
- [ ] 验收：新建→存草稿→刷新 `?id` 回显；改文→发布→PB 中 `status/publishedAt/editedAt` 正确

## M6 部署与联调

- [x] 迁入 MonostichBlog 仓库 `editor/` 子目录（与博客同仓库，不再独立仓库）
- [x] 主 workflow `deploy.yml`：构建博客后追加「安装/构建编辑器 → 打包 → 上传
  → 解到 `editor-releases/<sha>` → 原子切软链 `pb_public/editor` → 健康检查」
- [ ] 服务器首部署：push 到 `main` 触发流水线，确认
  `https://admin.monostich.cloud/editor/` 正常（PocketBase 原生托管，
  无 nginx / systemd / CORS 改动）
- [ ] 确认 PocketBase 自带后台 `/_/` 不受影响
- [x] 端到端走查 DoD 四项（SPEC §10，本地真实 PB 联调 9/9 通过）
- [x] README：本地开发（Vite 代理）/ 部署 / 环境变量说明

---

## 风险与对策

| 风险 | 对策 |
|---|---|
| 图片 URL 与前台 loader 契约不符（博客物化失败） | M4 严格按 `/api/files/articles/<id>/<stored>` 回填；联调时用真实构建验证 |
| attachments 追加语义写错（误覆盖） | 用 `pb.update(id, formData)` 且只 append 新 key；联调验证旧图仍在 |
| ByteMD React SSR/样式冲突 | 纯 CSR SPA，无 SSR；样式隔离在单页内 |
| token 过期体验差 | M2 统一 401 拦截回登录 |
| `pb_public` 部署路径与 PB 后台 `/_/` 冲突 | SPA 固定 `/editor/` 前缀 + `base:'/editor/'`；M6 验证 `/_/` 不受影响 |

## 附录：已确认决策

- **Q1 部署位置**：不开子域；SPA 挂在 `admin.monostich.cloud/editor/`
  （服务器 `pb_public/editor/`，与 API 同源）。
- **Q2 CORS**：同源部署，无需任何 CORS 改动。
- **Q4 封面**：不做，编辑器不暴露 `cover` 字段。
- **Q5 前台动态化**：缓做，另立 issue；本期「发布」只保证数据库即时更新。
