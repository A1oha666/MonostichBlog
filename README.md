# monostich.cloud

个人博客。

## 技术栈

- [Astro](https://astro.build) — 静态站点生成
- [PocketBase](https://pocketbase.io) — 内容后台（Go + SQLite），构建时拉取已发布内容
- [Pagefind](https://pagefind.app) — 构建后生成的静态全文搜索
- [GitHub Actions](https://github.com/features/actions) — 构建与部署

## 仓库结构

- `src/` `public/` — 博客（Astro）
- `editor/` — 单页文章编辑器（Vite + React + ByteMD），独立子工程，见 `editor/README.md`
- `pb/` — 本地 PocketBase（`pb_hooks`/`pb_migrations` 软链到 MonostichPB）

## 部署

push 到 `main` 触发 `.github/workflows/deploy.yml`，一次流水线发布两个产物：

- 博客 `dist/` → `/var/www/monostich.cloud/current`
- 编辑器 `editor/dist/` → PocketBase `pb_public/editor/`（`https://admin.monostich.cloud/editor/`）

## 后端仓库

PocketBase 的钩子、数据库迁移与部署流水线在独立仓库
[A1oha666/MonostichPB](https://github.com/A1oha666/MonostichPB)（服务器运维手册在其 `deploy/server.md`）。

本地开发时，`pb/pb_hooks` 与 `pb/pb_migrations` 是指向旁边克隆的 MonostichPB 的软链接；
