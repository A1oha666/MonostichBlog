// 文章变更 → 自动触发 GitHub Actions 重建。
//
// 放在 PocketBase 可执行文件旁的 pb_hooks/ 目录即自动加载。
// 需要的环境变量（建议经 systemd EnvironmentFile 提供，见 deploy/）：
//   PB_GITHUB_REPO          形如 "Aloha666/MonostichBlog"（必填，缺省则只记日志）
//   PB_GITHUB_TOKEN         有 repository_dispatch 权限的令牌（必填）
//   PB_GITHUB_API           默认 https://api.github.com（测试时可指向本地接收端）
//   PB_DISPATCH_COOLDOWN_MS 派发冷却毫秒数，默认 60000（连续保存只触发一次）
//
// v0.40 起 jsvm 把回调序列化后独立执行，回调里看不到本文件顶层作用域，
// 共享逻辑放 rebuild-lib.js、由回调体内 require() 加载。
//
// 注意：$http.send 必须是请求路径上的最后一个动作，其后不要再读它的返回值，
// 否则该次保存的响应会被异常化成 400（数据本身不受影响）。

console.log('[rebuild] hook 已加载: repo=' + ($os.getenv('PB_GITHUB_REPO') || '(未配置)'));

onRecordAfterCreateSuccess((e) => {
    e.next();
    const lib = require(`${__hooks}/rebuild-lib.js`);
    if (lib.touchesPublicSite(e.record)) {
        lib.requestRebuild(e.record.getString('slug'));
    }
}, 'articles');

onRecordAfterUpdateSuccess((e) => {
    e.next();
    const lib = require(`${__hooks}/rebuild-lib.js`);
    if (lib.touchesPublicSite(e.record)) {
        lib.requestRebuild(e.record.getString('slug'));
    }
}, 'articles');

onRecordAfterDeleteSuccess((e) => {
    e.next();
    const lib = require(`${__hooks}/rebuild-lib.js`);
    if (e.record.getString('status') === 'published') {
        lib.requestRebuild(e.record.getString('slug'));
    }
}, 'articles');
