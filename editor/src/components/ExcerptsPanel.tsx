import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg, fetchExcerpts, saveExcerpts, useBeforeUnload } from '../lib/article';
import type { ExcerptItem } from '../lib/pb';

interface Props {
  push: (msg: string, kind?: 'ok' | 'err') => void;
}

type Row = ExcerptItem & { key: number };

export function ExcerptsPanel({ push }: Props) {
  const [open, setOpen] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const nextKey = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useBeforeUnload(dirty);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rec = await fetchExcerpts();
      setRecordId(rec?.id ?? null);
      setRows((Array.isArray(rec?.items) ? rec.items : []).map((item) => ({
        key: ++nextKey.current,
        text: item.text ?? '',
        author: item.author ?? '',
        source: item.source ?? '',
      })));
      setDirty(false);
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const close = useCallback(() => {
    if (saving) return;
    if (dirty && !window.confirm('页脚摘抄有未保存改动，关闭后将丢失，继续？')) return;
    setOpen(false);
  }, [dirty, saving]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const patch = (key: number, field: keyof ExcerptItem, value: string) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
    setDirty(true);
  };

  const move = (index: number, offset: -1 | 1) => {
    setRows((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
    setDirty(true);
  };

  const remove = (key: number) => {
    const row = rows.find((item) => item.key === key);
    if (row?.text.trim() && !window.confirm('删除这条摘抄？保存列表后将从站点移除。')) return;
    setRows((current) => current.filter((row) => row.key !== key));
    setDirty(true);
  };

  const invalid = rows.some((row) => !row.text.trim());
  const doSave = async () => {
    if (saving || !dirty || invalid || loadError) return;
    setSaving(true);
    try {
      const items = rows.map(({ text, author, source }) => ({
        text: text.trim(),
        author: author?.trim() ?? '',
        source: source?.trim() ?? '',
      }));
      const rec = await saveExcerpts(recordId, items);
      setRecordId(rec.id);
      setRows((current) => current.map((row) => ({
        ...row,
        text: row.text.trim(),
        author: row.author?.trim() ?? '',
        source: row.source?.trim() ?? '',
      })));
      setDirty(false);
      push('页脚摘抄已保存，站点将自动重建');
    } catch (e) {
      push(`保存页脚摘抄失败：${errMsg(e)}`, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="excerpts-menu" ref={wrapRef}>
      <button
        className={`btn${open ? ' active' : ''}`}
        onClick={() => open ? close() : setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        页脚摘抄
      </button>
      {open && (
        <div className="excerpts-dropdown" role="dialog" aria-label="编辑页脚摘抄">
          <div className="excerpts-head">
            <span>首页页脚摘抄</span>
            {dirty && <i className="dirty-dot" title="有未保存改动" />}
          </div>
          <p className="excerpts-help">按列表顺序每日轮换；清空列表后不展示摘抄。</p>
          {loading ? (
            <div className="open-hint">载入中…</div>
          ) : loadError ? (
            <div className="excerpts-error" role="alert">
              载入失败：{loadError}
              <button className="btn" onClick={() => void load()}>重试</button>
            </div>
          ) : (
            <>
              <div className="excerpts-list">
                {rows.length === 0 && <p className="excerpts-empty">还没有摘抄，点击下方按钮添加。</p>}
                {rows.map((row, index) => (
                  <fieldset className="excerpt-row" key={row.key} disabled={saving}>
                    <legend>第 {index + 1} 条</legend>
                    <div className="excerpt-row-actions">
                      <button type="button" className="btn ghost" onClick={() => move(index, -1)} disabled={index === 0 || saving} aria-label={`上移第 ${index + 1} 条`}>↑</button>
                      <button type="button" className="btn ghost" onClick={() => move(index, 1)} disabled={index === rows.length - 1 || saving} aria-label={`下移第 ${index + 1} 条`}>↓</button>
                      <button type="button" className="btn ghost excerpt-remove" onClick={() => remove(row.key)} aria-label={`删除第 ${index + 1} 条`}>删除</button>
                    </div>
                    <label className="profile-field">
                      摘抄内容 <span aria-hidden="true">*</span>
                      <textarea rows={3} value={row.text} onChange={(e) => patch(row.key, 'text', e.target.value)} aria-invalid={!row.text.trim()} aria-describedby={!row.text.trim() ? `excerpt-error-${row.key}` : undefined} placeholder="输入摘抄内容" />
                    </label>
                    {!row.text.trim() && <span className="excerpt-field-error" id={`excerpt-error-${row.key}`} role="alert">摘抄内容不能为空</span>}
                    <div className="excerpt-meta-fields">
                      <label className="profile-field">作者<input value={row.author ?? ''} onChange={(e) => patch(row.key, 'author', e.target.value)} placeholder="可选" /></label>
                      <label className="profile-field">出处<input value={row.source ?? ''} onChange={(e) => patch(row.key, 'source', e.target.value)} placeholder="可选" /></label>
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="excerpts-actions">
                <button className="btn" disabled={saving} onClick={() => {
                  setRows((current) => [...current, { key: ++nextKey.current, text: '', author: '', source: '' }]);
                  setDirty(true);
                }}>+ 添加摘抄</button>
                <button className="btn primary" disabled={saving || !dirty || invalid} onClick={() => void doSave()}>
                  {saving ? '保存中…' : '保存列表'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
