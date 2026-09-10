import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 部署在 PocketBase 服务器的 pb_public/editor/，故 base 固定 /editor/。
// 本地开发用 proxy 把 /api 转发给本机 PocketBase，形成同源假象，免 CORS。
export default defineConfig({
  base: '/editor/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_PB_PROXY_TARGET ?? 'http://127.0.0.1:8090',
        changeOrigin: true,
      },
    },
  },
});
