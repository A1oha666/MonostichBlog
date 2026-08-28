import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  const thinkings = await getCollection("thinkings", ({ data }) => !data.draft);
  const moments = await getCollection("moments", ({ data }) => !data.draft);

  // 小记已并入 Thinkings：moments 内容归入 Thinkings 分类，链接锚到合并后的列表页
  const labels = { notes: "Notes", thinkings: "Thinkings", moments: "Thinkings" };
  const items = [...notes, ...thinkings, ...moments]
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((entry) => ({
      title: entry.data.title,
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
