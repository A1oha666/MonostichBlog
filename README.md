# monostich.cloud

个人博客。

## 技术栈

- [Astro](https://astro.build) — 静态站点生成
- [PocketBase](https://pocketbase.io) — 内容后台（Go + SQLite），构建时拉取已发布内容
- [Pagefind](https://pagefind.app) — 构建后生成的静态全文搜索
- [GitHub Actions](https://github.com/features/actions) — 构建与部署

## 仓库结构

- `src/` `public/` — 博客（Astro）
- `docs/` — 设计文档与原型，见 `docs/README.md`
- `editor/` — 单页文章编辑器（Vite + React + ByteMD），独立子工程，见 `editor/README.md`
- `../models-intel/` — Models 舆情中心的独立 Go 后端：官方链接审核、只读发布 API 和 SQLite；方案见本仓库 `docs/models-center-plan.md`
- `pb/` — 本地 PocketBase（`pb_hooks`/`pb_migrations` 软链到 MonostichPB）

## 首页摘抄

登录写作界面（`/editor/`），点击顶栏的“页脚摘抄”，即可添加、编辑、删除和调整列表顺序。每条包含：

摘抄内容（必填）、作者（可选）、出处（可选）。

首页页脚上方每天展示一条，按访客本地日期从列表中循环选取；浅色与深色共用内容。清空列表会隐藏整个区域。保存后 PocketBase 钩子自动触发站点重建。数据存在后端的 `site_excerpts` 集合中，迁移会预置原有摘抄。

## 部署

push 到 `main` 触发 `.github/workflows/deploy.yml`，一次流水线发布两个产物：

- 博客 `dist/` → `/var/www/monostich.cloud/current`
- 编辑器 `editor/dist/` → PocketBase `pb_public/editor/`（`https://admin.monostich.cloud/editor/`）

模型发布页在构建时读取独立 Models API。Go 服务与静态站同机运行，由 Nginx 将 `https://monostich.cloud/models-api/` 转发到 `127.0.0.1:8080`；博客仓库变量 `MODELS_SERVICE_URL` 设为 `https://monostich.cloud/models-api`。部署流水线先等待 `/readyz`，再生成 `/models/`、事件详情页与 `/models/rss.xml`。浏览器每 30 秒走同域 `/models-api/` 读取模型清单、状态、发布动态和来源健康状态，无需 CORS。未配置时页面保留构建快照或空清单，并明确提示实时数据未连接。新事件的 RSS 与预生成详情页仍在下一次构建时更新；页面列表中的事件使用实时详情页。Go 服务部署说明见 `../models-intel/README.md`。

## 后端仓库

PocketBase 的钩子、数据库迁移与部署流水线在独立仓库
[A1oha666/MonostichPB](https://github.com/A1oha666/MonostichPB)（服务器运维手册在其 `deploy/server.md`）。

本地开发时，`pb/pb_hooks` 与 `pb/pb_migrations` 是指向旁边克隆的 MonostichPB 的软链接；
