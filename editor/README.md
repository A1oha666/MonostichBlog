# MonostichEditor

单页 Markdown 文章编辑器：直连 PocketBase，写完即发布，摆脱「提交 Git → CI → 部署」。

- 设计与计划见 `docs/SPEC.md`、`docs/PLAN.md`
- 需求背景见 `docs/ISSUE.md`

## 技术栈

Vite + React 18 + TypeScript + ByteMD（GFM / 代码高亮 / KaTeX 公式）+ PocketBase JS SDK。
纯静态产物，部署在 PocketBase 服务器的 `pb_public/editor/`，与 API 同源，无 CORS。

## 本地开发

```bash
npm install
npm run dev        # http://127.0.0.1:5174/editor/
```

默认由 `vite.config.ts` 的 `server.proxy` 把 `/api` 转发到本机 PocketBase
`http://127.0.0.1:8090`（同源假象，免 CORS）。本地 PB 见
`../MonostichBlog/pb/`（`./pocketbase serve --http=127.0.0.1:8090`）。

如需直连其他实例，设 `VITE_PB_BASE_URL`（此时浏览器直连，需目标 PB 放开 CORS）。

## 使用

1. 打开 `/editor/`，用 `editors` 集合的管理员账号登录（token 存 localStorage，刷新保持）。
2. 顶部表单填标题 / slug / 类型 / 标签 / 摘要 / 发布时间；下方 ByteMD 双栏写正文。
3. 图片直接**粘贴或拖拽**进编辑区：无 id 时先静默建草稿，然后上传到该文章
   `attachments`，自动回填 `![](/api/files/articles/<id>/<stored>)`。
4. **存草稿** `status=draft`；**立即发布** `status=published`（`publishedAt` 为空补当前）。
   快捷键：`Cmd/Ctrl+S` 存草稿，`Cmd/Ctrl+Shift+S` 发布。
5. 编辑已有文章：`/editor/?id=<recordId>` 载入回显；保存后地址栏自动写入 `?id=`。

## 部署

编辑器与博客同一仓库、同一 workflow。push 到 `main` 后，
`.github/workflows/deploy.yml` 会依次构建博客与编辑器，把博客发布到
`/var/www/monostich.cloud/current`，把编辑器发布到 PocketBase 服务器的
`/opt/monostich/pb/pb_public/editor/`（软链原子切换），访问
`https://admin.monostich.cloud/editor/`。

PocketBase 原生托管 `pb_public`，无需重启 / 改 nginx；自带后台 `/_/` 不受影响。

也可在仓库根手动触发：Actions → Deploy monostich.cloud → Run workflow。

## PocketBase 规则

编辑器以 `editors` 身份读写 `articles`，依赖迁移
`../MonostichPB/pb_migrations/1787933000_articles_editor_write.js`：

- `create/update` = 仅 `editors` 集合成员（**用 collectionId 硬编码**，见迁移注释的
  collectionName 坑）；`delete` 仅 superuser。
- `list/view` = 公开看已发布，`editors` 可读全部（含草稿）。

## 关键契约

- **图片 URL** 必须是 `{origin}/api/files/articles/<recordId>/<storedName>` —— 前台
  博客 `pocketbase-loader.ts` 按此识别并物化；禁止其他形式。
- **文件追加** 必须用 multipart 键 `attachments+`（带 `+`）；裸 `attachments` 会覆盖。
- `content` 存原始 Markdown，与现有数据零迁移。
