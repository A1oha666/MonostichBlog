// content-dispatch.pb.js 的共享逻辑（非 .pb.js，不会被当作钩子自动加载）。
//
// PocketBase v0.40 的 jsvm 会把钩子回调序列化后在隔离上下文里执行，
// 回调内引用不到 .pb.js 文件顶层的变量/函数；共享逻辑必须放在这样的
// 普通模块里，由回调在触发时 require()（模块有统一缓存，
// 冷却计时等跨请求状态就存在模块作用域里）。

let lastDispatchMs = 0;

// 新发布 / 编辑已发布文章 / 从已发布转归档或草稿，都会改变公开站点内容；
// 纯草稿期间的反复保存不打扰构建。
function touchesPublicSite(rec) {
    const statusBefore = rec.original().getString('status');
    const statusAfter = rec.getString('status');
    return statusAfter === 'published' || statusBefore === 'published';
}

function requestRebuild(slug) {
    const REPO = $os.getenv('PB_GITHUB_REPO') || '';
    const TOKEN = $os.getenv('PB_GITHUB_TOKEN') || '';
    if (!REPO || !TOKEN) {
        console.log('[rebuild] 未配置 PB_GITHUB_REPO / PB_GITHUB_TOKEN，跳过派发:', slug);
        return;
    }
    const GITHUB_API = ($os.getenv('PB_GITHUB_API') || 'https://api.github.com').replace(/\/$/, '');
    const COOLDOWN_MS = Number($os.getenv('PB_DISPATCH_COOLDOWN_MS') || 60000);
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

module.exports = { touchesPublicSite, requestRebuild };
