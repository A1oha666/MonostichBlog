// 项目数据：repo 为 "#" 表示尚无公开仓库，列表侧会渲染为静态行（不放假链接）
export const projects = [
  {
    name: "ZcodeRCLI",
    desc: "一个用 Go 写的 Coding Agent CLI",
    tags: ["go", "coding-agent", "cli"],
    repo: "https://github.com/A1oha666/ZcodeRCLI",
    status: "developing",
  },
  {
    name: "MonostichBlog",
    desc: "基于 Astro 的极简风格个人博客",
    tags: ["astro", "blog"],
    repo: "https://github.com/A1oha666/MonostichBlog",
    status: "active",
  },
  {
    name: "argus-gateway",
    desc: "LLM 请求网关：统一鉴权、限流、重试与回退，Go 实现。",
    tags: ["go", "llm", "gateway"],
    repo: "#",
    status: "developing",
  },
  {
    name: "tool-router",
    desc: "Agent 工具路由框架：声明式注册与并行分发。",
    tags: ["go", "agent"],
    repo: "#",
    status: "developing",
  },
];
