import { useCallback, useEffect, useState } from 'react';
import { pb, ARTICLES_COLLECTION, type ArticleRecord } from '../lib/pb';
import { errMsg } from '../lib/article';

const PAGE_SIZE = 30;

const TYPE_LABEL: Record<ArticleRecord['type'], string> = {
  notes: 'Notes',
  thinkings: 'Thinkings',
  moments: 'Moments',
};

const STATUS_LABEL: Record<ArticleRecord['status'], string> = {
  draft: '草稿',
  published: '已发布',
  archived: '归档',
};

// 'YYYY-MM-DD HH:mm:ssZ'（PB UTC）→ 'YYYY-MM-DD HH:mm'（本地）
function fmtDate(pbDate: string): string {
  if (!pbDate) return '';
  const d = new Date(pbDate.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  onOpen: (id: string) => void;
  onError: (msg: string) => void;
}

// 文章列表：编辑器登录后的入口页。列出全部状态（含草稿），点击行进入编辑。
export function ArticleList({ onOpen, onError }: Props) {
  const [items, setItems] = useState<ArticleRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      // SDK 默认自动取消同 key 的重复请求（StrictMode 双挂载、快速翻页都会触发），
      // 给每次加载独立 key，避免首个请求被 autocancel 误报成失败。
      const reqKey = `articles-list-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        const res = await pb
          .collection(ARTICLES_COLLECTION)
          .getList<ArticleRecord>(p, PAGE_SIZE, { sort: '-editedAt', requestKey: reqKey });
        setItems(res.items);
        setTotalPages(res.totalPages);
        setTotalItems(res.totalItems);
        setPage(res.page);
      } catch (e) {
        onError(`载入文章列表失败：${errMsg(e)}`);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <div className="list-page">
      <div className="list-head">
        <h2>全部文章</h2>
        <span className="list-count">{loading ? '…' : `${totalItems} 篇`}</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="list-empty">载入中…</div>
      ) : items.length === 0 ? (
        <div className="list-empty">还没有文章，点右上角「新建」开始写作。</div>
      ) : (
        <ul className={`list-rows${loading ? ' busy' : ''}`}>
          {items.map((it) => (
            <li key={it.id}>
              <button className="list-row" onClick={() => onOpen(it.id)}>
                <span className="list-row-title">{it.title || '未命名'}</span>
                <span className="list-row-meta">
                  <span className={`tag status-${it.status}`}>{STATUS_LABEL[it.status] ?? it.status}</span>
                  <span className="tag">{TYPE_LABEL[it.type] ?? it.type}</span>
                  {it.label && <span className="tag">{it.label}</span>}
                  <span className="list-date">{fmtDate(it.editedAt || it.updated)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="list-pager">
          <button className="btn" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn"
            disabled={loading || page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
