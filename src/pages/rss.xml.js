import rss from "@astrojs/rss";
import { getBlogCollections, momentTitle } from "../lib/content";
import { safeDate } from "../lib/format";

export async function GET(context) {
  const { notes, thinkings, moments } = await getBlogCollections();

  // 小记已并入 Thinkings：moments 内容归入 Thinkings 分类，链接锚到合并后的列表页
  const labels = { notes: "Notes", thinkings: "Thinkings", moments: "Thinkings" };
  const items = [...notes, ...thinkings, ...moments]
    .sort((a, b) => safeDate(b.data.date).valueOf() - safeDate(a.data.date).valueOf())
    .map((entry) => ({
      title: entry.collection === "moments" ? momentTitle(entry) : entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.date,
      categories: [labels[entry.collection]],
      link: entry.collection === "moments"
        ? `/thinkings/#${entry.id}`
        : `/${entry.collection}/${entry.id}/`,
    }));

  return rss({
    title: "Aloha — backend & agent engineering",
    description:
      "Personal site & blog: backend development, distributed systems, and LLM agent applications.",
    site: context.site,
    items,
    customData: "<language>zh-cn</language>",
  });
}
