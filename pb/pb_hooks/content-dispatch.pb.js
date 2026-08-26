// 文章变更 → 自动触发 GitHub Actions 重建。
//
// 放在 PocketBase 可执行文件旁的 pb_hooks/ 目录即自动加载。
// 需要的环境变量（建议经 systemd EnvironmentFile 提供，见 deploy/）：
//   PB_GITHUB_REPO          形如 "Aloha666/MonostichBlog"（必填，缺省则只记日志）
//   PB_GITHUB_TOKEN         有 repository_dispatch 权限的令牌（必填）
//   PB_GITHUB_API           默认 https://api.github.com（测试时可指向本地接收端）
//   PB_DISPATCH_COOLDOWN_MS 派发冷却毫秒数，默认 60000（连续保存只触发一次）
//
// 注意：$http.send 必须是请求路径上的最后一个动作，其后不要再读它的返回值，
// 否则该次保存的响应会被异常化成 400（数据本身不受影响）。

let lastDispatchMs = 0;

const COOLDOWN_MS = Number($os.getenv('PB_DISPATCH_COOLDOWN_MS') || 60000);
const GITHUB_API = ($os.getenv('PB_GITHUB_API') || 'https://api.github.com').replace(/\/$/, '');
const REPO = $os.getenv('PB_GITHUB_REPO') || '';
const TOKEN = $os.getenv('PB_GITHUB_TOKEN') || '';

console.log('[rebuild] hook 已加载: repo=' + (REPO || '(未配置)') + ' 冷却=' + COOLDOWN_MS + 'ms');

function touchesPublicSite(rec) {
    // 新发布 / 编辑已发布文章 / 从已发布转归档或草稿，都会改变公开站点内容；
    // 纯草稿期间的反复保存不打扰构建。
    const statusBefore = rec.original().getString('status');
    const statusAfter = rec.getString('status');
    return statusAfter === 'published' || statusBefore === 'published';
}

function requestRebuild(slug) {
    if (!REPO || !TOKEN) {
        console.log('[rebuild] 未配置 PB_GITHUB_REPO / PB_GITHUB_TOKEN，跳过派发:', slug);
        return;
    }
    const now = Date.now();
    if (now - lastDispatchMs < COOLDOWN_MS) {
        console.log('[rebuild] 冷却期内，跳过重复派发:', slug);
        return;
    }
    lastDispatchMs = now;
    console.log('[rebuild] 准备通知 GitHub 重建:', slug);
    $http.send({
        url: GITHUB_API + '/repos/' + REPO + '/dispatches',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + TOKEN,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'monostich-pocketbase',
        },
        body: JSON.stringify({ event_type: 'content-published' }),
    });
}

onRecordAfterCreateSuccess((e) => {
    e.next();
    if (touchesPublicSite(e.record)) {
        requestRebuild(e.record.getString('slug'));
    }
}, 'articles');

onRecordAfterUpdateSuccess((e) => {
    e.next();
    if (touchesPublicSite(e.record)) {
        requestRebuild(e.record.getString('slug'));
    }
}, 'articles');

onRecordAfterDeleteSuccess((e) => {
    e.next();
    if (e.record.getString('status') === 'published') {
        requestRebuild(e.record.getString('slug'));
    }
}, 'articles');
