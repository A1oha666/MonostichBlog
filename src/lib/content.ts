import { getCollection, type CollectionEntry } from "astro:content";
import { DRAFT_PREVIEW } from "./format";

// 草稿过滤：INCLUDE_DRAFTS=1 的本地预览构建放行草稿，正式构建（CI 不设
// 该变量）只出 published；content.config.ts 的 draft 字段是第二道保险。
const draftFilter = ({ data }: { data: { draft: boolean } }) =>
  DRAFT_PREVIEW || !data.draft;

export type BlogCollections = {
  notes: CollectionEntry<"notes">[];
  thinkings: CollectionEntry<"thinkings">[];
  moments: CollectionEntry<"moments">[];
};

// 全站内容统一入口：列表页 / 归档 / RSS 共用，draft 过滤只在这里写一次。
export const getBlogCollections = (): Promise<BlogCollections> =>
  Promise.all([
    getCollection("notes", draftFilter),
    getCollection("thinkings", draftFilter),
    getCollection("moments", draftFilter),
  ]).then(([notes, thinkings, moments]) => ({ notes, thinkings, moments }));

// moments 允许无标题，列表/归档/RSS 统一用摘要兜底
// （loader 侧已用正文摘录兜底 summary，不会为空串之外的 undefined）。
export const momentTitle = (entry: CollectionEntry<"moments">): string =>
  entry.data.title || entry.data.summary;
