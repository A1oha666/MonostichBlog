import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  const thinkings = await getCollection("thinkings", ({ data }) => !data.draft);

  const items = [...notes, ...thinkings]
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.date,
      categories: [entry.collection === "thinkings" ? "Thinkings" : "Notes"],
      link: `/${entry.collection}/${entry.id}/`,
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
