// PocketBase 客户端。
//
// 生产环境 SPA 与 API 同源（admin.monostich.cloud/editor/ 访问，
// /api 由同一个 PocketBase 提供），故默认空字符串 = window.location.origin。
// 本地开发由 vite.config.ts 的 server.proxy 把 /api 转发到 127.0.0.1:8090。
// 如需直连其他实例，可设 VITE_PB_BASE_URL 覆盖。
import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_PB_BASE_URL ?? '');

// 计算文件 URL：正文图片契约必须是
//   {origin}/api/files/articles/{recordId}/{storedName}
// 前台博客 pocketbase-loader.ts 只识别这种形式并物化图片。
export function pbFileUrl(recordId: string, storedName: string): string {
  const base = pb.baseURL || window.location.origin;
  return `${base}/api/files/articles/${recordId}/${storedName}`;
}

export interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  type: 'notes' | 'thinkings' | 'moments';
  status: 'draft' | 'published' | 'archived';
  label: string;
  summary: string;
  content: string;
  publishedAt: string;
  editedAt: string;
  attachments: string[];
}

// 编辑器的写权限依赖 editors 集合（articles 的 create/update 对认证用户开放）。
export const EDITORS_COLLECTION = 'editors';
export const ARTICLES_COLLECTION = 'articles';
