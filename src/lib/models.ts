export interface ModelEvidence {
  id: string;
  source_url: string;
  source_kind: string;
  official: boolean;
  excerpt?: string;
  captured_at: string;
}

export interface ModelRelease {
  id: string;
  vendor_id: string;
  vendor_name: string;
  model_family: string;
  model_id: string;
  title: string;
  event_type: 'new_model' | 'model_update' | 'availability' | 'retirement';
  summary: string;
  availability: string[];
  announced_at: string;
  discovered_at: string;
  published_at: string;
  updated_at: string;
  status: 'published';
  evidence: ModelEvidence[];
}

export interface ModelSourceStatus {
  vendor_id: string;
  vendor: string;
  mode: string;
  enabled: boolean;
  last_success_at: string | null;
  last_attempt_at?: string | null;
  status: string;
}

export function sourceStatusLabel(source: ModelSourceStatus): string {
  const mode = source.mode === 'mixed' ? '多源' : source.mode.toUpperCase();
  switch (source.status) {
    case 'ok': return `${mode} 正常`;
    case 'error': return `${mode} 检查失败`;
    case 'degraded': return '部分来源异常';
    case 'pending': return `${mode} 等待首检`;
    case 'not_enabled': return '未启用';
    case 'manual_only': return '人工核验';
    default: return '状态未知';
  }
}

export interface ModelCatalogItem {
  vendor_id: string;
  vendor_name: string;
  model_family: string;
  model_id: string;
  status: 'announced' | 'documented_available' | 'retired';
  availability: string[];
  announced_at: string;
  published_at: string;
  release_id: string;
  source_url: string;
}

const serviceURL = import.meta.env.MODELS_SERVICE_URL?.replace(/\/$/, '');
const defaultSources: ModelSourceStatus[] = [
  ['openai', 'OpenAI / ChatGPT'], ['deepseek', 'DeepSeek'], ['anthropic', 'Anthropic / Claude'],
  ['xai', 'xAI / Grok'], ['moonshot', 'Kimi'], ['minimax', 'MiniMax'], ['zai', 'GLM / Z.ai'],
  ['tencent', '腾讯混元'], ['xiaomi', '小米 MiMo'],
].map(([vendor_id, vendor]) => ({ vendor_id, vendor, mode: 'manual', enabled: false, last_success_at: null, status: 'manual_only' }));

async function api<T>(path: string): Promise<T | null> {
  if (!serviceURL) return null;
  const response = await fetch(`${serviceURL}${path}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Models API returned ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

export async function getModelReleases(): Promise<ModelRelease[]> {
  if (!serviceURL) return [];
  const all: ModelRelease[] = [];
  let cursor = '';
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const data = await api<{ items: ModelRelease[]; next_cursor: string }>(`/v1/releases?${query}`);
    if (!data) return [];
    all.push(...data.items);
    if (!data.next_cursor) return all;
    cursor = data.next_cursor;
  }
  throw new Error('Models API exceeded the 2,000 release build limit');
}

export async function getModelSourceStatuses(): Promise<ModelSourceStatus[]> {
  if (!serviceURL) return defaultSources;
  const data = await api<{ items: ModelSourceStatus[] }>('/v1/sources/status');
  return data?.items ?? defaultSources;
}

export async function getModelCatalog(): Promise<ModelCatalogItem[]> {
  if (!serviceURL) return [];
  const data = await api<{ items: ModelCatalogItem[] }>('/v1/models');
  return data?.items ?? [];
}

export function modelStatusLabel(status: ModelCatalogItem['status']): string {
  return {
    announced: '已宣布',
    documented_available: '官方记录可用',
    retired: '已退役',
  }[status];
}

export function releaseDateValue(value: string): string {
  return value.length === 10 ? value : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value));
}

export function eventTypeLabel(type: ModelRelease['event_type']): string {
  return {
    new_model: '新模型',
    model_update: '模型更新',
    availability: '开放渠道变化',
    retirement: '退役',
  }[type];
}
