// 把大逃殺版打包成「一個 HTML 檔」，不需要伺服器，直接雙擊就能玩
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');
const out = resolve('.build-tmp');
await build({
  root, base: './', logLevel: 'warn',
  build: {
    outDir: out, emptyOutDir: true, modulePreload: false,
    assetsInlineLimit: 100 * 1024 * 1024, // 圖片全部內嵌，打包成單一檔案
    rollupOptions: { input: join(root, 'br.html') },
  },
});
let html = readFileSync(join(out, 'br.html'), 'utf8');
const assets = join(out, 'assets');
for (const f of readdirSync(assets)) {
  const code = readFileSync(join(assets, f), 'utf8');
  if (f.endsWith('.js')) {
    html = html.replace(new RegExp(`<script[^>]*src="\./assets/${f.replace('.', '\.')}"[^>]*></script>`), () => `<script type="module">\n${code}\n</script>`);
  } else if (f.endsWith('.css')) {
    html = html.replace(new RegExp(`<link[^>]*href="\./assets/${f.replace('.', '\.')}"[^>]*>`), () => `<style>${code}</style>`);
  }
}
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('還有沒內嵌的檔案');
writeFileSync(join(root, '試玩-打人三項.html'), html);
// GitHub Pages 用：docs/index.html
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'index.html'), html);
rmSync(out, { recursive: true, force: true });
console.log('done', (html.length / 1024).toFixed(0) + ' KB');
