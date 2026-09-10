# 需求：单页文章编辑器 + 博客前端动态化

## 概述

后端维持 **PocketBase（Go）** 作为纯 headless 服务，不做整站后台。新增一个自建**单页编辑器**，只覆盖"写文章、改文章、发布"这一件事，直接调 PocketBase REST 写库，内容不进 Git、发布即生效，摆脱当前"自动部署"链路。

## 背景

- 现状：PocketBase 自带后台是裸 `<textarea>`，且其 UI 为闭源预编译、无法二次开发；自动部署依赖 `hook → repository_dispatch → CI → scp` 的脆弱链路，常"改了没上线"。
- 诉求：编辑舒服、图片可插入、单账号、可自维护、后端为 Go、不做"提交→CI→部署"。

## 方案

### 1. 单页文章编辑器（自建前端）
- 独立子域 `editor.monostich.cloud`，单个页面，不做列表/仪表盘等整站后台。
- Markdown **左写 + 右侧实时预览**（编辑器用 Milkdown / Toast UI 类，Markdown 为一等公民），与现有 `content` 字段格式一致，**数据零迁移**。
- 字段表单覆盖：标题 / slug / type / status / label / summary / publishedAt。
- **图片拖拽上传** → 调 PocketBase `/api/files` → 自动回填正确 URL（不再手写带记录 ID 的链接）。
- 登录用现有 `editors` 集合（单账号）。

### 2. 前端（Astro）改动态 API 读取
- 文章列表 / 正文 / 图片改为浏览器端 fetch PocketBase REST 渲染；发布即见，无构建步骤。
- 保留现有 Astro 静态壳与视觉。

### 3. 收敛冗余代码
- 删除 `content-dispatch.pb.js`、`rebuild-lib.js` 及 deploy.yml 的 `repository_dispatch` 触发。
- 保留 `view-counter`（访问计数）。

## 原则
- 只动文章读取与编辑入口；PocketBase 后端、数据 schema、认证、文件存储一律不改、不迁移。
- 后端 Go；前端技术栈不限。
- 单作者；代码自持，可长期自己维护，不依赖小众荒废项目。
