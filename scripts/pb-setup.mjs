// 幂等初始化 PocketBase：editors 授权集合 + articles 内容集合 + API 规则。
// 用法：node scripts/pb-setup.mjs [--reset-rules]
// 需要 .env 或环境变量：PB_BASE_URL（默认 http://127.0.0.1:8090）、
// PB_ADMIN_EMAIL、PB_ADMIN_PASSWORD。
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.PB_BASE_URL ?? 'http://127.0.0.1:8090';

function loadDotEnv() {
  const candidates = [
    path.resolve('pb/.env.local'),
    path.resolve('.env.local'),
    path.resolve('.env'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
}
loadDotEnv();

async function api(method, urlPath, body, token) {
  const res = await fetch(`${BASE}/api${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  // 1. 管理员登录
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('缺少 PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD');
    process.exit(1);
  }
  const auth = await api('POST', '/collections/_superusers/auth-with-password', { identity: email, password });
  const admin = auth.token;

  // 2. editors 集合（本地草稿预览用的只读授权身份）
  let editors;
  try {
    editors = await api('GET', '/collections/editors', undefined, admin);
  } catch {
    editors = await api('POST', '/collections', {
      name: 'editors',
      type: 'auth',
      fields: [],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      manageRule: null,
    }, admin);
    console.log('+ 创建集合 editors');
  }
  const draftReadRule =
    `status = "published" || @request.auth.id != "" && @request.auth.collectionId = "${editors.id}"`;

  // 3. articles 集合
  const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  const articleSpec = {
    name: 'articles',
    type: 'base',
    fields: [
      { type: 'text', name: 'title', required: true },
      { type: 'text', name: 'slug', required: true },
      { type: 'select', name: 'type', values: ['notes', 'thinkings', 'moments'], maxSelect: 1, required: true },,,
      { type: 'select', name: 'status', values: ['draft', 'published', 'archived'], maxSelect: 1, required: true },
      { type: 'text', name: 'label' },
      { type: 'text', name: 'summary' },
      // PocketBase v0.23+ 的 text 字段 max=0 不是不限长，而是默认 5000 上限，
      // 必须显式设大数值，否则长文保存报 validation_max_text_constraint。
      { type: 'text', name: 'content', max: 200000 },
      { type: 'number', name: 'views' },
      { type: 'date', name: 'publishedAt' },
      { type: 'date', name: 'editedAt' },
      { type: 'file', name: 'cover', maxSelect: 1, mimeTypes: IMAGE_MIMES, thumbs: ['1200x0'] },
      { type: 'file', name: 'attachments', maxSelect: 20, mimeTypes: IMAGE_MIMES, thumbs: ['1200x0'] },
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_articles_type_slug` ON `articles` (`type`, `slug`)'],
    // 公开只能读到已发布；editors 身份可读全部（用于草稿预览构建）
    listRule: draftReadRule,
    viewRule: draftReadRule,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };

  let articles;
  let exists = true;
  try {
    articles = await api('GET', '/collections/articles', undefined, admin);
  } catch {
    exists = false;
  }
  if (exists) {
    // PATCH 单独跑，失败时把真实校验错误抛出来，而不是被吞进“创建”分支
    await api('PATCH', '/collections/articles', articleSpec, admin);
    console.log('~ 更新集合 articles（字段/索引/规则）');
  } else {
    articles = await api('POST', '/collections', articleSpec, admin);
    console.log('+ 创建集合 articles');
  }

  console.log('\n完成。当前规则：');
  console.log(`  list/view : ${articles.listRule}`);
  console.log(`  写操作    : 仅超级管理员`);
  console.log(`  唯一约束  : (type, slug)`);

  // 4. 本地预览用 editors 账号（仅本地开发，凭据写入 pb/.env.local，不入库）
  const envFile = path.resolve('pb/.env.local');
  const editorEmail = 'editor@monostich.local';
  const found = await api(
    'GET',
    `/collections/editors/records?filter=${encodeURIComponent(`email="${editorEmail}"`)}`,
    undefined,
    admin,
  );
  let editorPasswordLine;
  if (found.items.length === 0) {
    const editorPassword = process.env.PB_EDITOR_PASSWORD ?? `ed_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`;
    await api('POST', '/collections/editors/records', {
      email: editorEmail,
      password: editorPassword,
      passwordConfirm: editorPassword,
    }, admin);
    console.log(`+ 创建 editors 账号 ${editorEmail}`);
    editorPasswordLine = `PB_EDITOR_PASSWORD=${editorPassword}`;
  } else if (process.env.PB_EDITOR_PASSWORD) {
    editorPasswordLine = `PB_EDITOR_PASSWORD=${process.env.PB_EDITOR_PASSWORD}`;
  } else {
    editorPasswordLine = '# PB_EDITOR_PASSWORD=<沿用既有账号，如需重置请设置环境变量后重跑>';
  }
  fs.writeFileSync(envFile, [
    '# 本地开发配置（勿提交）',
    `PB_BASE_URL=${BASE}`,
    `PB_ADMIN_EMAIL=${email}`,
    `PB_ADMIN_PASSWORD=${password}`,
    `PB_EDITOR_EMAIL=${editorEmail}`,
    editorPasswordLine,
    '',
  ].join('\n') + '\n');
  console.log(`\n凭据与本地配置已写入 ${envFile}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
