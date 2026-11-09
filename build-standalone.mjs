// 把賽車樣品打包成「一個 HTML 檔」，不需要伺服器，直接雙擊就能玩
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');
const out = resolve('.build-tmp');
await build({
  root, base: './', logLevel: 'warn',
  build: {
    outDir: out, emptyOutDir: true, modulePreload: false,
    rollupOptions: { input: join(root, 'sample-race.html') },
  },
});
let html = readFileSync(join(out, 'sample-race.html'), 'utf8');
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
writeFileSync(join(root, '試玩-賽車樣品.html'), html);
// GitHub Pages 用：docs/index.html
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'index.html'), html);
rmSync(out, { recursive: true, force: true });
console.log('done', (html.length / 1024).toFixed(0) + ' KB');
