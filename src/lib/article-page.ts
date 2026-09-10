import { getCollection, render, type CollectionEntry } from "astro:content";
import { DRAFT_PREVIEW, safeDate } from "./format";

// notes / thinkings 两个详情页路由共用的静态路径生成：
// 按日期倒序排好，previous = 更早一篇，next = 更新一篇。
type ArticleCollection = "notes" | "thinkings";

export interface ArticlePageProps<C extends ArticleCollection> {
  entry: CollectionEntry<C>;
  previous?: CollectionEntry<C>;
  next?: CollectionEntry<C>;
}

export async function getArticleStaticPaths<C extends ArticleCollection>(
  collection: C,
): Promise<{ params: { slug: string }; props: ArticlePageProps<C> }[]> {
  const entries = (
    await getCollection(collection, ({ data }) => DRAFT_PREVIEW || !data.draft)
  ).sort((a, b) => safeDate(b.data.date).valueOf() - safeDate(a.data.date).valueOf());

  return entries.map((entry, index) => ({
    params: { slug: entry.id },
    props: {
      entry,
      previous: entries[index + 1],
      next: entries[index - 1],
    },
  }));
}

// 相邻文章导航只需标题和链接；小记不生成详情页，因此这里无需兜底。
export const toAdjacentArticle = (article?: CollectionEntry<ArticleCollection>) =>
  article && {
    title: article.data.title,
    href: `/${article.collection}/${article.id}/`,
  };

export { render };
