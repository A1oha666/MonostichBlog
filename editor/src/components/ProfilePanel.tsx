import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg, fetchProfile, saveProfile, type ProfileForm } from '../lib/article';

interface Props {
  push: (msg: string, kind?: 'ok' | 'err') => void;
}

const EMPTY_FORM: ProfileForm = { bio: '', email: '', github: '' };

// 「个人介绍」编辑面板：About 页的简介 / email / github 存在
// site_profile 单例集合里，这里做读改存；保存触发站点重建（PB hook）。
export function ProfilePanel({ push }: Props) {
  const [open, setOpen] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rec = await fetchProfile();
      if (rec) {
        setRecordId(rec.id);
        setForm({ bio: rec.bio ?? '', email: rec.email ?? '', github: rec.github ?? '' });
      } else {
        setRecordId(null);
        setForm(EMPTY_FORM);
      }
      setDirty(false);
    } catch (e) {
      push(`载入个人介绍失败：${errMsg(e)}`, 'err');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // 关外点击 / Esc 关闭；有未保存改动时确认
  useEffect(() => {
    if (!open) return;
    const tryClose = () => {
      if (dirty && !window.confirm('个人介绍有未保存改动，关闭后将丢失，继续？')) return;
      setOpen(false);
    };
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) tryClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tryClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, dirty]);

  const patch = (p: Partial<ProfileForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
  };

  const doSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const rec = await saveProfile(recordId, form);
      setRecordId(rec.id);
      setDirty(false);
      push('个人介绍已保存，站点将自动重建');
    } catch (e) {
      push(`保存失败：${errMsg(e)}`, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        className={`btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        个人介绍
      </button>
      {open && (
        <div className="profile-dropdown" role="dialog" aria-label="编辑个人介绍">
          <div className="profile-head">
            About 页个人介绍
            {dirty && <i className="dirty-dot" title="有未保存改动" />}
          </div>
          {loading ? (
            <div className="open-hint">载入中…</div>
          ) : (
            <>
              <label className="profile-field">
                简介
                <textarea
                  rows={4}
                  value={form.bio}
                  placeholder="一句话介绍自己"
                  onChange={(e) => patch({ bio: e.target.value })}
                />
              </label>
              <label className="profile-field">
                Email
                <input
                  value={form.email}
                  placeholder="name@example.com"
                  onChange={(e) => patch({ email: e.target.value.trim() })}
                />
              </label>
              <label className="profile-field">
                GitHub
                <input
                  value={form.github}
                  placeholder="@username"
                  onChange={(e) => patch({ github: e.target.value.trim() })}
                />
              </label>
              <div className="profile-actions">
                <button className="btn primary" disabled={saving || !dirty} onClick={() => void doSave()}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
