import rss from '@astrojs/rss';
import { getModelReleases } from '../../lib/models';

export const prerender = true;
export async function GET(context) {
  const releases = await getModelReleases();
  return rss({
    title: '模型发布动态 — Aloha',
    description: '附有厂商官方证据的模型发布、更新与可用性变化。',
    site: context.site,
    items: releases.map((release) => ({
      title: `${release.vendor_name}：${release.title}`,
      description: release.summary,
      pubDate: new Date(release.published_at),
      link: `/models/${release.id}/`,
      categories: [release.vendor_name, release.event_type],
    })),
    customData: '<language>zh-cn</language>',
  });
}
