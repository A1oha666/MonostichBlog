import { defineCollection, z } from "astro:content";
import { pocketBaseLoader } from "./lib/pocketbase-loader";

// PocketBase 的日期字段为空时返回 ""，z.coerce.date() 会把 "" 转成
// Invalid Date（NaN）而不是校验失败，页面侧 new Date()/toISOString() 随之
// 崩溃。这里先把空串归一为 undefined/null，再做 coerce，从源头杜绝
// Invalid Date 进入 content layer。
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

const articleSchema = z.object({
  // 小记（moments）允许无标题；loader 侧已兜底为 ""，这里保持宽容
  title: z.string().catch(""),
  // publishedAt 允许为空（作者未排期就发布）：loader 已用 created 兜底，
  // 这里再兜一次；最终实在缺失时回退 epoch 0，保证排序/渲染不崩
  date: z.preprocess(emptyToUndef, z.coerce.date().catch(new Date(0))),
  // 语义上的修订时间；为空则不展示“更新于”
  editedAt: z.preprocess(emptyToUndef, z.coerce.date().nullable().catch(null)),
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
