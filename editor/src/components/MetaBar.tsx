import { useLayoutEffect, useRef } from 'react';
import type { ArticleRecord } from '../lib/pb';
import type { SaveMeta } from '../lib/article';

interface Props {
  meta: SaveMeta;
  recordId: string | null;
  status: ArticleRecord['status'] | null;
  slugError: string;
  onChange: (patch: Partial<SaveMeta>) => void;
}

const TYPES: { value: ArticleRecord['type']; label: string }[] = [
  { value: 'notes', label: 'Notes' },
  { value: 'thinkings', label: 'Thinkings' },
  { value: 'moments', label: 'Moments' },
];

export function MetaBar({ meta, recordId, status, slugError, onChange }: Props) {
  const segRef = useRef<HTMLDivElement>(null);

  // iOS 风格分段控件：测量激活项位置，驱动滑块胶囊
  useLayoutEffect(() => {
    const seg = segRef.current;
    if (!seg) return;
    const active = seg.querySelector<HTMLElement>('.seg-item.active');
    const thumb = seg.querySelector<HTMLElement>('.seg-thumb');
    if (active && thumb) {
      thumb.style.left = `${active.offsetLeft}px`;
      thumb.style.width = `${active.offsetWidth}px`;
    }
  }, [meta.type]);

  return (
    <div className="meta-bar">
      <div className="meta-row">
        <label className="meta-field meta-title">
          标题
          <input
            value={meta.title}
            placeholder={meta.type === 'moments' ? '小记可留空' : '文章标题'}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </label>
        <label className="meta-field meta-slug">
          Slug
          <input
            value={meta.slug}
            placeholder={recordId ? '留空自动生成' : '保存后自动生成'}
            onChange={(e) => onChange({ slug: e.target.value.trim() })}
          />
          {slugError && <span className="field-error">{slugError}</span>}
        </label>
        <div className="meta-field meta-type">
          类型
          <div className="seg" ref={segRef}>
            <span className="seg-thumb" aria-hidden="true" />
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={meta.type === t.value ? 'seg-item active' : 'seg-item'}
                onClick={() => onChange({ type: t.value })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="meta-field meta-label-field">
          标签
          <input value={meta.label} placeholder="label" onChange={(e) => onChange({ label: e.target.value })} />
        </label>
        <label className="meta-field meta-date">
          发布时间
          <input
            type="datetime-local"
            value={meta.publishedAt}
            onChange={(e) => onChange({ publishedAt: e.target.value })}
          />
        </label>
      </div>
      <div className="meta-row">
        <label className="meta-field meta-summary">
          摘要
          <input
            value={meta.summary}
            placeholder="summary（可选）"
            onChange={(e) => onChange({ summary: e.target.value })}
          />
        </label>
        <span className={`meta-status${status === 'published' ? ' published' : ''}`}>
          {status ? (status === 'published' ? '已发布' : status === 'draft' ? '草稿' : status) : '未保存'}
        </span>
      </div>
    </div>
  );
}
