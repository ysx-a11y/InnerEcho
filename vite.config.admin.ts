import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { resolve } from 'path';

/**
 * 管理端独立构建配置。
 * 产物输出到 dist-admin/，只包含 admin.html 与 admin 入口依赖，
 * 不包含用户端 SPA、文章页、sitemap、sw.js 等用户资源。
 */
export default defineConfig({
  plugins: [react()],
  // publicDir 是 Vite 顶层选项，放在 build 里会被忽略并回退到默认 public/
  publicDir: resolve(__dirname, 'public-admin'),
  build: {
    outDir: 'dist-admin',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('html-to-image')) return 'vendor-canvas';
          return undefined;
        },
      },
    },
  },
});
