import { defineCollection, z } from "astro:content";
import { pocketBaseLoader } from "./lib/pocketbase-loader";

const articleSchema = z.object({
  // 小记（moments）允许无标题；loader 侧已兜底为 ""，这里保持宽容
  title: z.string().catch(""),
  date: z.coerce.date(),
  // 语义上的修订时间；为空则不展示“更新于”
  editedAt: z.coerce.date().nullable().catch(null),
  summary: z.string().default(""),
  label: z.string().optional(),
  cover: z.string().default(""),
  // 构建时快照的访问次数（展示用），实际计数走 PocketBase 自定义路由
  views: z.number().default(0),
  // 双保险字段：loader 默认已过滤草稿，页面再按此过滤一次，
  // 防止 INCLUDE_DRAFTS=1 的预览构建被误部署。
  draft: z.boolean().default(false),
});

export const collections = {
  notes: defineCollection({ loader: pocketBaseLoader("notes"), schema: articleSchema }),
  thinkings: defineCollection({ loader: pocketBaseLoader("thinkings"), schema: articleSchema }),
  moments: defineCollection({ loader: pocketBaseLoader("moments"), schema: articleSchema }),
};
