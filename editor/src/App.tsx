import { useCallback, useEffect, useRef, useState } from 'react';
import { LoginDialog } from './components/LoginDialog';
import { MetaBar } from './components/MetaBar';
import { MdEditor } from './components/MdEditor';
import { ArticleList } from './components/ArticleList';
import { useAuth, logout } from './lib/auth';
import {
  errMsg,
  fetchArticle,
  pbToLocalInput,
  saveArticle,
  syncIdToUrl,
  useBeforeUnload,
  useImageUpload,
  useToast,
  type SaveMeta,
} from './lib/article';
import { pb } from './lib/pb';
import type { ArticleRecord } from './lib/pb';

const EMPTY_META: SaveMeta = {
  title: '',
  slug: '',
  type: 'notes',
  label: '',
  summary: '',
  publishedAt: '',
  content: '',
};

// 'list'：文章列表（入口页）；'edit'：写作（新建或修改既有文章）
type View = 'list' | 'edit';

export default function App() {
  const { isLoggedIn, email } = useAuth();
  const { toasts, push } = useToast();

  const [view, setView] = useState<View>('list');
  const [recordId, setRecordIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<ArticleRecord['status'] | null>(null);
  const [meta, setMeta] = useState<SaveMeta>(EMPTY_META);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [loading, setLoading] = useState(true);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const metaRef = useRef(meta);
  metaRef.current = meta;
  const recordIdRef = useRef(recordId);
  recordIdRef.current = recordId;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useBeforeUnload(dirty && view === 'edit');

  // 有未保存改动时切换视图需确认（保存后 / 刚载入则无感切换）
  const confirmDiscard = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm('有未保存的改动，确定离开当前文章吗？');
  }, []);

  const openList = useCallback(() => {
    if (!confirmDiscard()) return;
    setListRefreshKey((k) => k + 1);
    setView('list');
    syncIdToUrl(null);
  }, [confirmDiscard]);

  const openNew = useCallback(() => {
    if (!confirmDiscard()) return;
    setRecordIdState(null);
    setStatus(null);
    setMeta(EMPTY_META);
    setDirty(false);
    setSlugError('');
    setView('edit');
    syncIdToUrl(null);
  }, [confirmDiscard]);

  const openArticle = useCallback(
    async (id: string) => {
      if (!confirmDiscard()) return;
      try {
        const rec = await fetchArticle(id);
        setRecordIdState(rec.id);
        setStatus(rec.status);
        setMeta({
          title: rec.title ?? '',
          slug: rec.slug ?? '',
          type: rec.type,
          label: rec.label ?? '',
          summary: rec.summary ?? '',
          publishedAt: pbToLocalInput(rec.publishedAt),
          content: rec.content ?? '',
        });
        setDirty(false);
        setSlugError('');
        setView('edit');
        syncIdToUrl(rec.id);
      } catch (e) {
        push(`载入文章失败：${errMsg(e)}`, 'err');
      }
    },
    [confirmDiscard, push],
  );

  // 用户菜单：点击外部或 Esc 关闭
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const setRecordId = useCallback(
    (id: string) => {
      setRecordIdState(id);
      setStatus((s) => s ?? 'draft');
      syncIdToUrl(id);
    },
    [],
  );

  const onError = useCallback((msg: string) => push(msg, 'err'), [push]);

  const { uploadImages } = useImageUpload({
    getRecordId: () => recordIdRef.current,
    setRecordId,
    getMeta: () => metaRef.current,
    onError,
  });

  // 401 统一拦截：任何请求未授权 → 清 token 回登录
  useEffect(() => {
    const origSend = pb.send.bind(pb);
    pb.send = async function <T>(...args: Parameters<typeof pb.send>): Promise<T> {
      try {
        return await origSend<T>(...args);
      } catch (e) {
        if (e && typeof e === 'object' && (e as { status?: number }).status === 401) {
          pb.authStore.clear();
        }
        throw e;
      }
    } as typeof pb.send;
    return () => {
      pb.send = origSend;
    };
  }, []);

  // 深链 /editor/?id=<recordId> → 直接进编辑；否则进列表
  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await openArticle(id);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn, openArticle]);

  const patchMeta = useCallback((patch: Partial<SaveMeta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    setDirty(true);
    if (patch.slug !== undefined) setSlugError('');
  }, []);

  const doSave = useCallback(
    async (target: 'draft' | 'published') => {
      if (saving) return;
      setSaving(true);
      setSlugError('');
      try {
        const rec = await saveArticle(recordIdRef.current, metaRef.current, target);
        setRecordIdState(rec.id);
        setStatus(rec.status);
        syncIdToUrl(rec.id);
        setDirty(false);
        push(target === 'published' ? '已发布' : '草稿已保存');
      } catch (e) {
        const msg = errMsg(e);
        if (msg.includes('slug')) setSlugError(msg.replace(/^slug:\s*/i, ''));
        push(`保存失败：${msg}`, 'err');
      } finally {
        setSaving(false);
      }
    },
    [saving, push],
  );

  // 快捷键：Cmd/Ctrl+S 存草稿，Cmd/Ctrl+Shift+S 发布（仅编辑态）
  useEffect(() => {
    if (view !== 'edit') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void doSave(e.shiftKey ? 'published' : 'draft');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, doSave]);

  if (!isLoggedIn) return <LoginDialog />;
  if (loading) return <div className="app-loading">载入中…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">Monostich</span>
          {view === 'edit' && (
            <span className="doc-title">
              {meta.title || '未命名'}
              {dirty && <i className="dirty-dot" title="有未保存改动" />}
            </span>
          )}
        </div>
        <div className="topbar-right">
          {view === 'edit' ? (
            <>
              <button className="btn" disabled={saving} onClick={() => void doSave('draft')}>
                {saving ? '保存中…' : '存草稿'}
              </button>
              <button className="btn primary" disabled={saving} onClick={() => void doSave('published')}>
                {status === 'published' ? '更新发布' : '立即发布'}
              </button>
              <button className="btn ghost" onClick={openList}>
                列表
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={openNew}>
              新建
            </button>
          )}
          <div className="user-menu" ref={userMenuRef}>
            <button
              className={`btn ghost user-chip${userMenuOpen ? ' open' : ''}`}
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="user-avatar" aria-hidden="true">
                {(email || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="user-email">{email}</span>
              <svg className="chevron" width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {userMenuOpen && (
              <div className="user-dropdown" role="menu">
                <button className="user-dropdown-item" role="menuitem" onClick={logout}>
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {view === 'list' ? (
        <ArticleList key={listRefreshKey} onOpen={(id) => void openArticle(id)} onError={onError} />
      ) : (
        <>
          <MetaBar meta={meta} recordId={recordId} status={status} slugError={slugError} onChange={patchMeta} />
          <MdEditor
            value={meta.content}
            onChange={(v) => patchMeta({ content: v })}
            uploadImages={uploadImages}
          />
        </>
      )}

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
