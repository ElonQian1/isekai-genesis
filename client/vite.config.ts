import { defineConfig } from 'vite';

export default defineConfig({
  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
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
