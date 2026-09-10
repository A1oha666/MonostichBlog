// 列表页使用的日期格式：正文区用「2026.08.24」圆点样式，datetime 属性用 ISO 短格式。
// content layer 传来的值可能是 Date，也可能是 ISO 字符串（PocketBase JSON），这里统一处理。
type DateLike = Date | string;

const asDate = (value: DateLike): Date => (value instanceof Date ? value : new Date(value));

// 无效日期防护：PocketBase 数据可能带空 publishedAt（loader 侧已用 created
// 兑底，但数据修复前的旧缓存/其他来源仍可能产出 Invalid Date）。
// epoch 0 兜底保证排序与渲染可完成，不会让整次构建崩溃。
export const safeDate = (value: DateLike): Date => {
  const d = asDate(value);
  return Number.isNaN(d.valueOf()) ? new Date(0) : d;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export const dotDate = (value: DateLike) => {
  const d = safeDate(value);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
};

export const isoDate = (value: DateLike) => {
  const d = safeDate(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// 草稿预览模式：INCLUDE_DRAFTS=1 的本地构建里，页面放行草稿条目。
// 正式部署（CI）从不设置该变量，此开关只属于作者本机。
export const DRAFT_PREVIEW = process.env.INCLUDE_DRAFTS === "1";

// 阅读时长：按本站慢读口径计算（约 80 字/分钟，拉丁词 160 词/分钟），至少 2 分钟。
// 与旧的 frontmatter 手写值相比：现网四篇中三篇结果一致。
export const readingTimeText = (body?: string) => {
  const source = body ?? "";
  const cjk = (source.match(/\p{Script=Han}/gu) ?? []).length;
  const latinWords = source
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
    .split(/\s+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w)).length;
  return `${Math.max(2, Math.ceil(cjk / 80 + latinWords / 160))} 分钟阅读`;
};
