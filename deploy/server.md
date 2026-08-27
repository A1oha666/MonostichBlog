# monostich.cloud 服务器运维手册

架构一句话：**PocketBase 只在服务器上跑（写内容）；GitHub Actions 构建静态站点并部署（读内容）。**
文章在后台改成 published 的瞬间，PocketBase 会主动通知 GitHub 触发构建，约一分钟后自动上线，全程浏览器操作。

```text
浏览器 ── admin.monostich.cloud/_/   写文章、传图、点发布
            │ nginx 反代（仅本机回环 8090）
阿里云 ─── PocketBase (systemd)
            │ published 变更时经 repository_dispatch 通知 GitHub（出站请求）
GitHub Actions ── 构建时拉取 published 内容，附件物化进 dist → 部署静态目录
```

## 一、首次部署

### 1. DNS

去域名控制台加一条 A 记录：`admin.monostich.cloud` → 服务器公网 IP。

### 2. 安装依赖与 PocketBase

```bash
# Ubuntu/Debian；x86_64 用 linux_amd64，ARM 用 linux_arm64
ssh root@<服务器IP>
apt update && apt install -y unzip sqlite3 curl

mkdir -p /opt/monostich/pb && cd /opt/monostich/pb
PB_VERSION=0.40.1
curl -sL -o pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
unzip -o pb.zip pocketbase && rm pb.zip && chmod +x pocketbase
```

### 3. 创建 GitHub 令牌（用于自动触发）

GitHub → Settings → Developer settings → **Fine-grained personal access tokens**：
- Repository access：只勾选博客仓库
- Permissions：**Contents: Read and write**（repository_dispatch 所需）
- 生成后复制 token（只显示一次）

### 4. 管理员、环境变量与 Hook

```bash
./pocketbase superuser upsert <你的邮箱> '<强密码>'

# 自动触发所需的凭据
cp <仓库>/deploy/pb.env.example pb.env
chmod 600 pb.env
vi pb.env     # 填入 PB_GITHUB_REPO 与 PB_GITHUB_TOKEN

# 加载自动触发钩子（serve 启动时自动扫描该目录）
mkdir -p pb_hooks
# 把仓库里的 pb/pb_hooks/content-dispatch.pb.js 上传到这个目录
```

回到本地执行一次集合初始化与内容导入：

```bash
# 本地仓库根目录；等 nginx 配好后再指向线上域名
export PB_BASE_URL=https://admin.monostich.cloud
export PB_ADMIN_EMAIL=<你的邮箱>
export PB_ADMIN_PASSWORD='<强密码>'
node scripts/pb-setup.mjs        # 建 articles/editors 集合 + API 规则
node scripts/pb-import           # 可选：导入本地现有文章
```

### 5. systemd 常驻

```bash
cp <仓库>/deploy/pocketbase.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now pocketbase
journalctl -u pocketbase -n 20    # 应看到 "[rebuild] hook 已加载: repo=..."
```

### 6. nginx

```bash
cp <仓库>/deploy/nginx-monostich.conf /etc/nginx/sites-available/monostich
ln -sf /etc/nginx/sites-available/monostich /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
# TLS（若已有其他证书方案可跳过）
apt install -y certbot python3-certbot-nginx
certbot --nginx -d monostich.cloud -d admin.monostich.cloud
```

验证：打开 `https://admin.monostich.cloud/_/` 能登录后台即通。
不要用防火墙开放 8090 —— 公网入口只有 nginx。

### 7. GitHub Actions

仓库内的 `.github/workflows/deploy.yml` 已配置完毕（含 `repository_dispatch` 自动触发和构建时的
`PB_BASE_URL`），不需要你再改。你现有的 SSH 部署密钥等 secrets 保持原样即可；
只需把改动提交推送一次，新的触发器才会生效。

### 8. 备份

```bash
cp <仓库>/deploy/backup-pocketbase.sh /opt/monostich/
chmod +x /opt/monostich/backup-pocketbase.sh
crontab -e
# 加入一行：
15 4 * * * /opt/monostich/backup-pocketbase.sh >> /var/log/pb-backup.log 2>&1
```

第二重保险：后台 Settings → Backups 开启定时快照（存在 pb_data/backups）。
恢复方式：解压备份包覆盖 `/opt/monostich/pb/pb_data` 后 `systemctl restart pocketbase`；
或后台 UI 直接导入某个内置快照。**建议部署完成后立刻演练一次恢复。**

## 二、日常写作（全程浏览器，全自动发布）

1. 打开 `https://admin.monostich.cloud/_/` 登录
2. articles → 新建记录：title / slug（英文短横线）/ type / summary / content 粘贴 Markdown；content 现在支持最多 **200,000 字符**；PocketBase 后台的 text 字段不要留默认 max=0（会按 5000 字符处理）。
   thinkings 可填 label（如「关于节奏」）；status 保持 **draft**
3. 配图：图片拖进 attachments，正文按
   `![说明](https://admin.monostich.cloud/api/files/articles/<记录ID>/<文件名>)` 引用
   （写原始文件名即可，构建时会自动解析 PB 的重命名并固化进静态站）
4. 发布：填 **publishedAt** 日期，status 改成 **published** → 保存
5. 一分钟内网站自动更新，无需再碰任何构建按钮
6. 从 published 改回 draft 或 archived 同样会自动触发重建（下架生效）
7. 文章详情页会显示访问次数；每个浏览器会话对同一篇文章只计一次，计数接口为 `POST /api/monostich/views`，不会触发网站重建。

> 保存时报红色错误的根因已修复：旧版钩子回调引用了序列化后不可见的顶层函数。现在共享逻辑通过 `require()` 模块加载；发布保存应返回正常成功响应。

## 三、本地开发

```bash
cd pb && ./pocketbase serve --http=127.0.0.1:8090   # 本地内容库
npm run dev                                          # 博客前端，默认连本地 PB
INCLUDE_DRAFTS=1 npm run build && npm run preview    # 含草稿的预览构建（勿部署产物）
```

凭据见 `pb/.env.local`（已被 gitignore）。未设置 `PB_GITHUB_TOKEN` 时钩子只记日志不派发。
本地与线上的集合结构如有变更，统一改 `scripts/pb-setup.mjs` 后分别在两侧重跑。

## 四、验收清单

- [ ] 后台能创建 Notes / Thinkings 草稿并粘贴语雀 Markdown
- [ ] 草稿不出现在公开站点与公开 API（`curl 'https://admin.monostich.cloud/api/collections/articles/records'` 只有 published）
- [ ] 上传图片并在正文引用，构建后图片随静态站发布、地址为站内路径
- [ ] 后台改 published 后约一分钟首页/分类页/详情页自动出现新文章（无需手动点构建）
- [ ] 上一篇下一篇、目录、修订时间、阅读时长正常
- [ ] `systemctl restart pocketbase` 后数据与附件完好
