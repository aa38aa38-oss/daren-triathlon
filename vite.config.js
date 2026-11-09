import { defineConfig } from 'vite';

// base: './' 讓打包後的檔案可以直接放到 GitHub Pages 任何路徑
export default defineConfig({
  base: './',
  server: { host: true },
});
