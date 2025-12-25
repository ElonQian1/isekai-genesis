import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
    fs: {
      // 允许访问项目根目录外的 WASM 文件
      allow: [
        // 当前 client 目录
        '.',
        // WASM 包目录
        path.resolve(__dirname, '../crates/game-wasm/pkg'),
      ],
    },
  },

  // 构建配置
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },

  // 优化配置
  optimizeDeps: {
    exclude: ['game-wasm'],
  },

  // 支持 WASM
  plugins: [],
});
