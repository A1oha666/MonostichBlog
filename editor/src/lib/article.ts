import { useCallback, useEffect, useRef, useState } from 'react';
import { pb, pbFileUrl, ARTICLES_COLLECTION, type ArticleRecord } from './pb';

export interface SaveMeta {
  title: string;
  slug: string;
  type: ArticleRecord['type'];
  label: string;
  summary: string;
  publishedAt: string; // datetime-local 值 '' 或 'YYYY-MM-DDTHH:mm'
  content: string;
}

export function toPbDateTime(local: string): string {
  // PocketBase date 字段接受 'YYYY-MM-DD HH:mm:ss'；datetime-local 是 'YYYY-MM-DDTHH:mm'
  if (!local) return '';
  return `${local.replace('T', ' ')}:00`;
}

export function nowPbDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ByteMD uploadImages 钩子：
//   1. 文章还没有 id（新建未保存）→ 先静默建草稿取 id；
//   2. attachments 以 multipart 追加（pb.update(id, formData) 对已有文件字段是追加语义）；
//   3. 从响应取新增文件的“存储名”（原名会被 PB 加随机后缀），回填 /api/files/... URL。
export function useImageUpload(opts: {
  getRecordId: () => string | null;
  setRecordId: (id: string) => void;
  getMeta: () => SaveMeta;
  onError: (msg: string) => void;
}) {
  const { getRecordId, setRecordId, getMeta, onError } = opts;
  const uploadingRef = useRef(false);

  const ensureRecordId = useCallback(async (): Promise<string | null> => {
    const existing = getRecordId();
    if (existing) return existing;
    if (uploadingRef.current) return null;
    uploadingRef.current = true;
    try {
      const meta = getMeta();
      const rec = await pb.collection(ARTICLES_COLLECTION).create<ArticleRecord>({
        title: meta.title,
        // slug 留空交给 PB autogeneratePattern 生成，避免新建即撞 unique 索引
        type: meta.type,
        status: 'draft',
        label: meta.label,
        summary: meta.summary,
        content: meta.content,
        editedAt: nowPbDateTime(),
      });
      setRecordId(rec.id);
      return rec.id;
    } catch (e) {
      onError(`创建草稿失败：${errMsg(e)}`);
      return null;
    } finally {
      uploadingRef.current = false;
    }
  }, [getRecordId, setRecordId, getMeta, onError]);

  const uploadImages = useCallback(
    async (files: File[]): Promise<{ url: string; alt: string }[]> => {
      const id = await ensureRecordId();
      if (!id) throw new Error('无法上传：文章尚未建立');

      const results: { url: string; alt: string }[] = [];
      // PB 文件字段追加语法（v0.40 实测）：必须用 `attachments+`（带 + 修饰）
      // 才是追加；裸 `attachments` 在后续请求中会覆盖已有文件（正确性坑）。
      // 单请求多文件：PB 会把多个 `attachments+` 全部追加，
      // 响应里的 attachments 末尾新增 N 个即本批存储名。
      const fd = new FormData();
      for (const file of files) fd.append('attachments+', file);
      try {
        const rec = await pb.collection(ARTICLES_COLLECTION).update<ArticleRecord>(id, fd);
        const all = rec.attachments ?? [];
        const added = all.slice(Math.max(0, all.length - files.length));
        files.forEach((file, i) => {
          const stored = added[i];
          if (stored) results.push({ url: pbFileUrl(id, stored), alt: file.name });
        });
        if (results.length !== files.length) {
          onError('部分图片上传后未拿到存储名，请重试');
        }
      } catch (e) {
        onError(`上传失败：${errMsg(e)}`);
      }
      return results;
    },
    [ensureRecordId, onError],
  );

  return { uploadImages };
}

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object') {
    const anyE = e as { message?: string; data?: Record<string, { message?: string }> };
    const fields = anyE.data
      ? Object.entries(anyE.data)
          .map(([k, v]) => (v?.message ? `${k}: ${v.message}` : ''))
          .filter(Boolean)
          .join('；')
      : '';
    if (fields) return fields;
    if (anyE.message) return anyE.message;
  }
  return String(e);
}

// 读取 ?id= 并载入文章
export async function fetchArticle(id: string): Promise<ArticleRecord> {
  return pb.collection(ARTICLES_COLLECTION).getOne<ArticleRecord>(id);
}

export async function saveArticle(
  id: string | null,
  meta: SaveMeta,
  status: 'draft' | 'published',
): Promise<ArticleRecord> {
  const publishedAt = meta.publishedAt
    ? toPbDateTime(meta.publishedAt)
    : status === 'published'
      ? nowPbDateTime()
      : '';
  const data = {
    title: meta.title,
    slug: meta.slug,
    type: meta.type,
    status,
    label: meta.label,
    summary: meta.summary,
    content: meta.content,
    publishedAt,
    editedAt: nowPbDateTime(),
  };
  if (id) return pb.collection(ARTICLES_COLLECTION).update<ArticleRecord>(id, data);
  return pb.collection(ARTICLES_COLLECTION).create<ArticleRecord>(data);
}

// datetime-local 回显：PB 存 'YYYY-MM-DD HH:mm:ss'（UTC），转本地 input 值
export function pbToLocalInput(pbDate: string): string {
  if (!pbDate) return '';
  const d = new Date(pbDate.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 保存成功后把 ?id= 写进地址栏，便于刷新/复制链接继续编辑
export function syncIdToUrl(id: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get('id') !== id) {
    url.searchParams.set('id', id);
    window.history.replaceState(null, '', url.toString());
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: 'ok' | 'err' }[]>([]);
  const idRef = useRef(0);
  const push = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return { toasts, push };
}

export function useBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
