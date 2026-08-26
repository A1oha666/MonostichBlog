// 冒烟测试：附件上传→Markdown 引用→构建物化→草稿隔离→草稿预览。
// 测试完自动还原现场并清理临时文件。用法：node scripts/smoke-attach-draft.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const BASE = process.env.PB_BASE_URL ?? 'http://127.0.0.1:8090';
let failed = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failed++;
};

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

async function api(method, urlPath, body, token) {
  const res = await fetch(`${BASE}/api${urlPath}`, {
    method,
    headers: { ...(token ? { Authorization: token } : {}), ...(body instanceof FormData ? {} : body ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// 生成一个 8x8 的合法 PNG
function tinyPng() {
  const width = 8, height = 8;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (1 + width * 4) + 1 + x * 4;
      raw[o] = 200; raw[o + 1] = 30; raw[o + 2] = 90; raw[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crcTable = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
    let crc = 0xffffffff;
    for (const b of td) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, td, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const png = await (async () => tinyPng())();

loadDotEnv(path.resolve('pb/.env.local'));

const adminAuth = await api('POST', '/collections/_superusers/auth-with-password', {
  identity: process.env.PB_ADMIN_EMAIL,
  password: process.env.PB_ADMIN_PASSWORD,
});
const admin = adminAuth.token;

// ---------- 阶段 A：图片物化 ----------
console.log('\n— 图片物化链路');
const found = await api('GET', `/collections/articles/records?filter=${encodeURIComponent('type="notes" && slug="retry-budgets"')}`, undefined, admin);
const rec = found.items[0];
// 幂等起点：剥掉历史运行遗留的测试图片行
const originalContent = rec.content.replace(/\n*!\[架构图\]\([^)]*\)\n*/g, '\n').trim();

const form = new FormData();
form.append('attachments', new Blob([png], { type: 'image/png' }), 'architecture.png');
await api('PATCH', `/collections/articles/records/${rec.id}`, form, admin);

// PocketBase 会把文件重命名为 原名_随机串.扩展名，以存储名为准做断言
const afterUpload = (await api('GET', `/collections/articles/records/${rec.id}`, undefined, admin)).attachments?.[0];
if (!afterUpload) throw new Error('附件上传失败');

await api('PATCH', `/collections/articles/records/${rec.id}`, {
  content: `${originalContent}\n\n![架构图](${BASE}/api/files/articles/${rec.id}/architecture.png)\n`,
}, admin);

execSync('npm run build --silent', { stdio: 'inherit' });

ok(fs.existsSync(`public/pb/notes/${rec.slug}/${afterUpload}`), `附件已物化到 public/pb/notes/retry-budgets/ (${afterUpload})`);
ok(fs.existsSync(`dist/pb/notes/retry-budgets/${afterUpload}`), '附件进入最终产物 dist/pb/...');
const noteHtml = fs.readFileSync(`dist/notes/${rec.slug}/index.html`, 'utf8');
ok(noteHtml.includes(`/pb/notes/retry-budgets/${afterUpload}`), 'markdown 图片引用已改写为站内路径（含解析后的存储名）');
ok(!noteHtml.includes('/api/files/'), 'HTML 中不再残留 PocketBase 文件 URL');
ok(!fs.existsSync('dist/api'), '公开站点不含指向 PocketBase 的动态路径');

// ---------- 阶段 B：草稿隔离与预览 ----------
console.log('\n— 草稿隔离与本地预览');
const draft = await api('POST', '/collections/articles/records', {
  title: '草稿冒烟测试',
  slug: 'smoke-draft',
  type: 'notes',
  status: 'draft',
  summary: '不应出现在公开站点。',
  content: '# 冒烟\n\n这是草稿内容。',
  publishedAt: new Date().toISOString(),
}, admin);

execSync('npm run build --silent', { stdio: 'inherit' });
ok(!fs.existsSync('dist/notes/smoke-draft'), '公开构建不含草稿页面');
ok(!fs.readFileSync('dist/notes/index.html', 'utf8').includes('草稿冒烟测试'), '列表页不含草稿标题');

process.env.INCLUDE_DRAFTS = '1';
execSync('INCLUDE_DRAFTS=1 npm run build --silent', { stdio: 'inherit' });
ok(fs.existsSync('dist/notes/smoke-draft'), 'INCLUDE_DRAFTS=1 本地预览包含草稿页面');

// ---------- 还原现场 ----------
console.log('\n— 还原现场');
await api('DELETE', `/collections/articles/records/${draft.id}`, undefined, admin);
await api('PATCH', `/collections/articles/records/${rec.id}`, {
  content: originalContent,
  attachments: [],
}, admin);
delete process.env.INCLUDE_DRAFTS;
fs.rmSync('public/pb', { recursive: true, force: true });
fs.rmSync('node_modules/.cache/monostich-pb', { recursive: true, force: true });
execSync('npm run build --silent', { stdio: 'inherit' });
ok(!fs.existsSync('dist/pb'), '清理后公开站点无残留 pb 目录');

console.log(failed === 0 ? '\n全部通过 ✅' : `\n有 ${failed} 项失败 ❌`);
process.exit(failed === 0 ? 0 : 1);
