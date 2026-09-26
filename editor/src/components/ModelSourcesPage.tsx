import { useCallback, useEffect, useState } from 'react';
import { pb } from '../lib/pb';
import { errMsg } from '../lib/article';

interface Source {
  id: string;
  mode: string;
  enabled: boolean;
  url: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error: string;
}

interface VendorSource {
  vendor_id: string;
  vendor: string;
  status: string;
  sources: Source[];
}

const statusLabel: Record<string, string> = {
  manual_only: '待接入', not_enabled: '已暂停', pending: '等待首次检查',
  ok: '运行正常', degraded: '部分异常', error: '检查失败',
};

function dateLabel(value: string | null) {
  if (!value) return '尚未检查';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN');
}

export function ModelSourcesPage() {
  const [vendors, setVendors] = useState<VendorSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const result = await pb.send<{ items: VendorSource[] }>('/api/monostich/models/sources', { method: 'GET' });
      setVendors([...result.items].sort((a, b) => Number(b.sources.length > 0) - Number(a.sources.length > 0) || a.vendor.localeCompare(b.vendor, 'zh-CN')));
      setError('');
    } catch (e) {
      setError(`无法读取来源状态：${errMsg(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(true); }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function setEnabled(source: Source, enabled: boolean) {
    setBusy(source.id);
    setNotice('');
    try {
      await pb.send(`/api/monostich/models/sources/${source.id}`, {
        method: 'PATCH', body: { enabled },
      });
      await refresh(true);
      setNotice(enabled ? '来源已启用，可立即检查。' : '来源已暂停。');
    } catch (e) {
      setError(`更新失败：${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function check(source: Source) {
    setBusy(source.id);
    setNotice('');
    try {
      const result = await pb.send<{ new_observations: number }>(`/api/monostich/models/sources/${source.id}/check`, { method: 'POST' });
      await refresh(true);
      setNotice(`检查完成，新增 ${result.new_observations} 条待审核线索。`);
    } catch (e) {
      await refresh(true);
      setError(`检查失败：${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const connected = vendors.filter(v => v.sources.length > 0).length;
  const running = vendors.filter(v => v.sources.some(s => s.enabled)).length;

  return <main className="models-admin">
    <div className="models-admin-heading">
      <div>
        <p className="models-admin-eyebrow">MODEL INTELLIGENCE</p>
        <h1>厂商接入管理</h1>
        <p>管理官方数据源的采集开关和检查状态。采集到的新线索进入审核队列，不会自动发布。</p>
      </div>
      <button className="btn" onClick={() => void refresh()} disabled={loading || busy !== null}>刷新状态</button>
    </div>
    <div className="models-admin-summary" aria-label="来源概况">
      <span><strong>{vendors.length}</strong> 家目标厂商</span>
      <span><strong>{connected}</strong> 家已接入</span>
      <span><strong>{running}</strong> 家运行中</span>
    </div>
    {error && <div className="models-admin-message error" role="alert">{error}</div>}
    {notice && <div className="models-admin-message" role="status">{notice}</div>}
    {loading && vendors.length === 0 ? <p className="models-admin-empty">正在读取厂商状态…</p> :
      <div className="models-admin-list">
        {vendors.map(vendor => <section className="models-admin-vendor" key={vendor.vendor_id}>
          <div className="models-admin-vendor-head">
            <div><h2>{vendor.vendor}</h2><span className="models-admin-id">{vendor.vendor_id}</span></div>
            <span className={`models-admin-status ${vendor.status}`}>{statusLabel[vendor.status] ?? vendor.status}</span>
          </div>
          {vendor.sources.length === 0 ? <p className="models-admin-placeholder">尚无官方自动采集源，等待逐家接入。</p> :
            vendor.sources.map(source => <div className="models-admin-source" key={source.id}>
              <div className="models-admin-source-main">
                <div><strong>{source.id}</strong><span className="models-admin-mode">{source.mode.toUpperCase()}</span></div>
                <a href={source.url} target="_blank" rel="noopener noreferrer">查看官方来源 ↗</a>
              </div>
              <dl className="models-admin-times">
                <div><dt>上次检查</dt><dd>{dateLabel(source.last_attempt_at)}</dd></div>
                <div><dt>上次成功</dt><dd>{dateLabel(source.last_success_at)}</dd></div>
              </dl>
              {source.last_error && <p className="models-admin-source-error" role="alert">最近错误：{source.last_error}</p>}
              <div className="models-admin-actions">
                <button className="btn" disabled={busy === source.id} onClick={() => void setEnabled(source, !source.enabled)}>
                  {source.enabled ? '暂停采集' : '启用采集'}
                </button>
                <button className="btn primary" disabled={!source.enabled || busy === source.id} onClick={() => void check(source)}>
                  {busy === source.id ? '处理中…' : '立即检查'}
                </button>
              </div>
            </div>)}
        </section>)}
      </div>}
  </main>;
}
