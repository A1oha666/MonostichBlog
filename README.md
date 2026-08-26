# monostich.cloud

个人博客。**Astro 静态站点 + PocketBase 内容后台**：文章在 PocketBase 后台用 Markdown 写，
构建时由自定义 content layer loader 拉取已发布内容，图片随之固化进静态产物——
公开站点是完全自包含的纯静态文件，访客流量不经过内容库。

```text
浏览器 ─┬─ 博客站点（Astro 构建的静态文件）
        └─ 内容后台 admin.monostich.cloud/_/（写文章、传图、发布）

PocketBase（Go + SQLite + 文件存储，127.0.0.1:8090）
  ↑ 构建时只读 published（无需凭据）
GitHub Actions → astro build → 附件物化进 dist/pb/ → 原子部署静态目录

发布无需点构建：后台 status 改成 published，PocketBase Hook 自动通知 GitHub 触发部署。
```

## 本地开发

```bash
cd pb && ./pocketbase serve --http=127.0.0.1:8090   # 启动本地内容库（首次先跑 pb:setup）
npm run dev                                          # http://localhost:4321
```

| 命令 | 用途 |
| --- | --- |
| `npm run pb:setup` | 初始化/更新集合、索引与 API 规则（幂等） |
| `npm run pb:import` | 把旧 frontmatter 文章导入 PocketBase（幂等） |
| `INCLUDE_DRAFTS=1 npm run build:preview` | 含草稿的预览构建（仅本机，勿部署） |
| `npm run smoke` | 冒烟测试：图片物化 + 草稿隔离全链路 |

本地凭据在 `pb/.env.local`（已 gitignore）。

## 日常写作与发布

全程浏览器操作，详见 [deploy/server.md](deploy/server.md#二日常写作全程浏览器全自动发布)：

1. 后台新建文章 → 粘贴 Markdown，配图拖进 attachments 并按提示路径引用正文
2. status 改为 `published`，填好 `publishedAt`
3. PocketBase 自动通知 GitHub Actions 部署，约一分钟后上线（手动 Run workflow 仅作后备）

## 文章模型

单一 `articles` 集合承载两个分类（`type`: notes / thinkings），`(type, slug)` 复合唯一。
字段：title / slug / type / label(Thinkings 小标题) / summary / content(Markdown) /
status(draft·published·archived) / publishedAt / editedAt / cover / attachments。
阅读时长在构建时按正文自动计算；无 tags（如需恢复，加回一个 JSON 字段即可）。

## 服务器运维

安装 nginx 配置、systemd 单元、备份任务和完整 runbook 见 [deploy/](deploy/)。
