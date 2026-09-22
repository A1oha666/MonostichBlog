import { useEffect, useRef, useState } from 'react';
import { errMsg, fetchRecentArticles } from '../lib/article';
import type { ArticleRecord } from '../lib/pb';

interface Props {
  currentId: string | null;
  dirty: boolean;
  onOpen: (id: string) => void;
  onError: (msg: string) => void;
}

const TYPE_LABELS: Record<ArticleRecord['type'], string> = {
  notes: 'Notes',
  thinkings: 'Thinkings',
  moments: 'Moments',
};

function fmtTime(pbDate: string): string {
  if (!pbDate) return '';
  const d = new Date(pbDate.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 「打开」下拉面板：列出最近编辑的文章（草稿 + 已发布），点击载入编辑。
// 打开时拉取一次；关外点击 / Esc 关闭（与顶栏用户菜单同一交互模式）。
export function ArticleListPanel({ currentId, dirty, onOpen, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ArticleRecord[] | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    fetchRecentArticles()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setItems([]);
          onError(`载入文章列表失败：${errMsg(e)}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, onError]);

  const pick = (id: string) => {
    if (id === currentId) {
      setOpen(false);
      return;
    }
    if (dirty && !window.confirm('当前文章有未保存改动，切换后将丢失，继续？')) return;
    setOpen(false);
    onOpen(id);
  };

  return (
    <div className="open-menu" ref={wrapRef}>
      <button
        className={`btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        打开
      </button>
      {open && (
        <div className="open-dropdown" role="menu">
          {items === null && <div className="open-hint">载入中…</div>}
          {items !== null && items.length === 0 && <div className="open-hint">还没有保存过的文章</div>}
          {items?.map((it) => (
            <button
              key={it.id}
              role="menuitem"
              className={`open-item${it.id === currentId ? ' current' : ''}`}
              onClick={() => pick(it.id)}
            >
              <span className="open-item-title">{it.title || it.slug || '（无标题）'}</span>
              <span className="open-item-meta">
                <span className={`open-badge ${it.status}`}>
                  {it.status === 'published' ? '已发布' : it.status === 'draft' ? '草稿' : it.status}
                </span>
                <span className="open-item-type">{TYPE_LABELS[it.type] ?? it.type}</span>
                <span className="open-item-time">{fmtTime(it.editedAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
