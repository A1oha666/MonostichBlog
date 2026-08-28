// PocketBase → Astro content layer loader。
//
// 构建时从 PocketBase 拉取某个分类（notes/thinkings/moments）的文章：
//   1. 通过 Astro 内置的 markdown 管线（@astrojs/markdown-remark，
//      与本地内容集合完全同源）渲染正文，得到同样的标题锚点与代码高亮；
//   2. 把正文中指向 PocketBase 文件的图片下载并物化到
//      public/pb/<type>/<slug>/，同时改写为站内绝对路径；
//   3. 封面同样物化；注入 content layer 后，页面侧的
//      getCollection()/render() 用法与原来完全一致。
//
// 环境变量：
//   PB_BASE_URL       PocketBase 地址，默认 http://127.0.0.1:8090；
//                     GitHub Actions 构建时设为 https://admin.monostich.cloud
//   INCLUDE_DRAFTS=1  包含草稿（配合 PB_EDITOR_* 凭据），仅限本地预览构建
//   PB_EDITOR_EMAIL / PB_EDITOR_PASSWORD  草稿预览用的授权身份
import fs from 'node:fs';
import path from 'node:path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import type { ContentLayerLoader } from 'astro/loaders';

const DEFAULT_BASE = 'http://127.0.0.1:8090';
const CACHE_ROOT = path.resolve('node_modules/.cache/monostich-pb');

type AnyRecord = Record<string, any>;
type AnyStore = { clear(): void; set(entry: AnyRecord): void };

function loadDotEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

async function pbApi<T = any>(base: string, method: string, urlPath: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(`${base}/api${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PocketBase ${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  return json as T;
}

async function getEditorToken(base: string): Promise<string | undefined> {
  const email = process.env.PB_EDITOR_EMAIL;
  const password = process.env.PB_EDITOR_PASSWORD;
  if (!email || !password) return undefined;
  const auth = await pbApi<{ token: string }>(base, 'POST', '/collections/editors/auth-with-password', {
    identity: email,
    password,
  });
  return auth.token;
}

async function fetchAllPublished(base: string, type: string, includeDrafts: boolean): Promise<AnyRecord[]> {
  const token = includeDrafts ? await getEditorToken(base) : undefined;
  let filter = `type="${type}"`;
  if (!includeDrafts) filter += ` && status="published"`;
  const items: AnyRecord[] = [];
  let page = 1;
  for (;;) {
    const res = await pbApi<{ items: AnyRecord[]; totalPages: number }>(
      base,
      'GET',
      `/collections/articles/records?perPage=100&page=${page}&sort=-publishedAt&filter=${encodeURIComponent(filter)}`,
      undefined,
      token,
    );
    items.push(...res.items);
    if (page >= res.totalPages) break;
    page++;
  }
  return items;
}

// 从 HTML 的属性值里找出 /api/files/articles/<recordId>/<filename> 引用并返回文件名
const PB_FILE_RE = /(?:src|href)=["']([^"']*\/api\/files\/articles\/[^"']+)["']/g;

// PocketBase 入库时会重命名文件（原名_随机串.扩展名），
// 而 Markdown 里写的是原始文件名，这里按记录的 attachments 列表做映射。
type FileIndex = Map<string, Set<string>>;

async function buildFileIndex(records: AnyRecord[]): Promise<FileIndex> {
  const idx: FileIndex = new Map();
  for (const rec of records) idx.set(rec.id, new Set(rec.attachments ?? []));
  return idx;
}

async function resolveStoredName(
  base: string,
  token: string | undefined,
  idx: FileIndex,
  recordId: string,
  wanted: string,
): Promise<string | null> {
  let names = idx.get(recordId);
  if (!names) {
    try {
      const rec = await pbApi<AnyRecord>(base, 'GET', `/collections/articles/records/${recordId}`, undefined, token);
      names = new Set(rec.attachments ?? []);
      idx.set(recordId, names);
    } catch {
      return null;
    }
  }
  if (!names) return null;
  if (names.has(wanted)) return wanted;
  const dot = wanted.lastIndexOf('.');
  const stem = dot === -1 ? wanted : wanted.slice(0, dot);
  const ext = dot === -1 ? '' : wanted.slice(dot);
  for (const name of names) {
    if (name.startsWith(`${stem}_`) && name.endsWith(ext)) return name;
    if (name.toLowerCase() === wanted.toLowerCase()) return name;
  }
  return null;
}

async function materializeFile(
  base: string,
  recordId: string,
  storedName: string,
  cacheDir: string,
  outAbsDir: string,
) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cached = path.join(cacheDir, storedName);
  if (!fs.existsSync(cached)) {
    const res = await fetch(`${base}/api/files/articles/${recordId}/${storedName}`);
    if (!res.ok) throw new Error(`下载附件失败 ${storedName}: ${res.status}`);
    fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  fs.mkdirSync(outAbsDir, { recursive: true });
  fs.copyFileSync(cached, path.join(outAbsDir, storedName));
}

let processorPromise: ReturnType<typeof createMarkdownProcessor> | undefined;

export function pocketBaseLoader(type: 'notes' | 'thinkings' | 'moments'): ContentLayerLoader {
  return {
    name: `pocketbase-${type}`,
    async load({ store }: { store: AnyStore; logger?: any }) {
      loadDotEnv(path.resolve('pb/.env.local'));
      loadDotEnv(path.resolve('.env'));
      const base = (process.env.PB_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
      const includeDrafts = process.env.INCLUDE_DRAFTS === '1';

      if (!processorPromise) {
        processorPromise = createMarkdownProcessor({ gfm: true });
      }
      const processor = await processorPromise;

      const records = await fetchAllPublished(base, type, includeDrafts);
      store.clear();
      const token = includeDrafts ? await getEditorToken(base) : undefined;
      const fileIndex = await buildFileIndex(records);

      for (const rec of records) {
        const outDirRel = path.posix.join('pb', type, rec.slug);
        const outAbsDir = path.resolve('public', outDirRel);
        const cacheDir = path.join(CACHE_ROOT, type, rec.id);

        const rendered = await processor.render(rec.content ?? '');
        // 第一遍：收集正文里所有指向 PocketBase 文件的引用，解析存储名并下载物化；
        // 第二遍：全部就绪后按“完整原匹配 → 新属性串”一次性替换，保证 HTML 里写的是真实落盘路径。
        let html = rendered.code;
        const refs = new Map<string, string>();
        await Promise.all(
          [...html.matchAll(PB_FILE_RE)].map(async (m) => {
            const url = m[1];
            const idx = url.indexOf('/api/files/articles/');
            const rel = url.slice(idx + '/api/files/articles/'.length);
            const slash = rel.indexOf('/');
            if (slash === -1) return;
            const recordIdPart = rel.slice(0, slash);
            const wanted = decodeURIComponent(rel.slice(slash + 1).split('?')[0]);
            const stored = await resolveStoredName(base, token, fileIndex, recordIdPart, wanted);
            if (!stored) throw new Error(`附件 ${recordIdPart}/${wanted} 不存在于该记录的 attachments`);
            const raw = m[0];
            const eqAt = raw.indexOf('=');
            const attrName = raw.slice(0, eqAt);
            const quote = raw.endsWith('"') ? '"' : "'";
            refs.set(raw, `${attrName}=${quote}/${outDirRel}/${stored}${quote}`);
            await materializeFile(base, recordIdPart, stored, cacheDir, outAbsDir);
          }),
        );
        for (const [from, to] of refs) html = html.split(from).join(to);

        let cover = '';
        if (rec.cover) {
          await materializeFile(base, rec.id, rec.cover, cacheDir, outAbsDir);
          cover = `/${outDirRel}/${rec.cover}`;
        }

        // 小记（moments）通常没有标题/摘要，只有十几个字的正文。
        // 这里从渲染后的正文提取一段纯文本摘录，作为列表页兜底文案。
        const plainExcerpt =
          type === 'moments'
            ? rendered.code
                .replace(/<[^>]+>/g, ' ')
                .replace(/&[a-z]+;/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80)
            : '';

        store.set({
          id: rec.slug,
          body: rec.content ?? '',
          data: {
            title: rec.title ?? '',
            date: rec.publishedAt ?? rec.created,
            editedAt: rec.editedAt ?? null,
            summary: rec.summary || plainExcerpt,
            label: rec.label || undefined,
            cover,
            // 构建时的浏览数快照；页面侧由 /api/monostich/views 实时自增
            views: rec.views ?? 0,
            draft: rec.status !== 'published',
          },
          rendered: {
            html,
            metadata: { headings: rendered.metadata.headings },
          },
        });
      }
    },
  };
}
