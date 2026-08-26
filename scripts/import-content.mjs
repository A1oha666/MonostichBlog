// 把 src/content/{notes,thinkings}/*.md 的 frontmatter 文章导入/更新到 PocketBase。
// 幂等：按 (type, slug) 查找已有记录，存在则更新，否则创建。
// 用法：node scripts/import-content.mjs [--dry]
// 凭据读取顺序：环境变量 > pb/.env.local。
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const BASE = process.env.PB_BASE_URL ?? 'http://127.0.0.1:8090';
const DRY = process.argv.includes('--dry');

function loadDotEnv() {
  const candidates = [path.resolve('pb/.env.local'), path.resolve('.env.local'), path.resolve('.env')];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
}

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
  if (!res.ok) throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const toDate = (v) => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? new Date(v).toISOString() : null);

async function main() {
  loadDotEnv();
  const auth = await api('POST', '/collections/_superusers/auth-with-password', {
    identity: process.env.PB_ADMIN_EMAIL,
    password: process.env.PB_ADMIN_PASSWORD,
  });
  const admin = auth.token;

  const contentRoot = path.resolve('src/content');
  const types = ['notes', 'thinkings'];
  let created = 0;
  let updated = 0;

  for (const type of types) {
    const dir = path.join(contentRoot, type);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const slug = file.replace(/\.md$/, '');
      const parsed = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      const fm = parsed.data;
      const dateIso = toDate(fm.date);
      const updatedIso = toDate(fm.updated);
      // 有独立 updated 且与发布日不同才保留为修订时间
      const editedAt = updatedIso && dateIso && updatedIso !== dateIso ? updatedIso : null;
      const record = {
        title: fm.title ?? slug,
        slug,
        type,
        status: fm.draft ? 'draft' : 'published',
        summary: fm.summary ?? '',
        label: fm.label ?? '',
        content: parsed.content.trim(),
        publishedAt: dateIso,
        editedAt,
      };

      const existing = await api(
        'GET',
        `/collections/articles/records?filter=${encodeURIComponent(`type="${type}" && slug="${slug}"`)}`,
        undefined,
        admin,
      );
      if (existing.items.length > 0) {
        const id = existing.items[0].id;
        if (DRY) {
          console.log(`~ [dry] 更新 ${type}/${slug}`);
          continue;
        }
        await api('PATCH', `/collections/articles/records/${id}`, record, admin);
        updated++;
        console.log(`~ 更新 ${type}/${slug}`);
      } else {
        if (DRY) {
          console.log(`+ [dry] 新建 ${type}/${slug}`);
          continue;
        }
        await api('POST', '/collections/articles/records', record, admin);
        created++;
        console.log(`+ 新建 ${type}/${slug}`);
      }
    }
  }

  console.log(`\n完成：新建 ${created} 篇，更新 ${updated} 篇${DRY ? '（dry run）' : ''}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
