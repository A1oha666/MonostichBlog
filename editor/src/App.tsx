import { useCallback, useEffect, useRef, useState } from 'react';
import { LoginDialog } from './components/LoginDialog';
import { MetaBar } from './components/MetaBar';
import { MdEditor } from './components/MdEditor';
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

export default function App() {
  const { isLoggedIn, email } = useAuth();
  const { toasts, push } = useToast();

  const [recordId, setRecordIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<ArticleRecord['status'] | null>(null);
  const [meta, setMeta] = useState<SaveMeta>(EMPTY_META);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const metaRef = useRef(meta);
  metaRef.current = meta;
  const recordIdRef = useRef(recordId);
  recordIdRef.current = recordId;

  useBeforeUnload(dirty);

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

  // 载入既有文章（?id=）
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
      } catch (e) {
        push(`载入文章失败：${errMsg(e)}`, 'err');
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn, push]);

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

  // 快捷键：Cmd/Ctrl+S 存草稿，Cmd/Ctrl+Shift+S 发布
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void doSave(e.shiftKey ? 'published' : 'draft');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doSave]);

  if (!isLoggedIn) return <LoginDialog />;
  if (loading) return <div className="app-loading">载入中…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">Monostich</span>
          <span className="doc-title">
            {meta.title || '未命名'}
            {dirty && <i className="dirty-dot" title="有未保存改动" />}
          </span>
        </div>
        <div className="topbar-right">
          <button className="btn" disabled={saving} onClick={() => void doSave('draft')}>
            {saving ? '保存中…' : '存草稿'}
          </button>
          <button className="btn primary" disabled={saving} onClick={() => void doSave('published')}>
            {status === 'published' ? '更新发布' : '立即发布'}
          </button>
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

      <MetaBar meta={meta} recordId={recordId} status={status} slugError={slugError} onChange={patchMeta} />

      <MdEditor
        value={meta.content}
        onChange={(v) => patchMeta({ content: v })}
        uploadImages={uploadImages}
      />

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
