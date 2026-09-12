export interface Excerpt {
  text: string;
  author?: string;
  source?: string;
}

// 新增摘抄时，在数组末尾添加一条记录；author 和 source 可以省略。
// 首页每天显示一条，浅色与深色主题共用这些内容。
export const excerpts: Excerpt[] = [
  {
    text: '自由意味着休息、艺术成果，还有我生命中智慧的施展。',
    author: '佩索阿',
    source: '《惶然录》',
  },
];
