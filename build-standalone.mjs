// 把遊戲打包成「一個 HTML 檔」，不需要伺服器，直接雙擊就能玩
//   打架版（brawl.html）→ docs/index.html、試玩-打人三項.html
//   大逃殺賽車版（br.html）→ docs/race.html（保留舊版）
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');

async function pack(entry, outputs) {
  const out = resolve('.build-tmp');
  await build({
    root, base: './', logLevel: 'warn',
    build: {
      outDir: out, emptyOutDir: true, modulePreload: false,
      assetsInlineLimit: 100 * 1024 * 1024, // 圖片全部內嵌，打包成單一檔案
      chunkSizeWarningLimit: 5000,
      rollupOptions: { input: join(root, entry) },
    },
  });
  let html = readFileSync(join(out, entry), 'utf8');
  const assets = join(out, 'assets');
  for (const f of readdirSync(assets)) {
    const code = readFileSync(join(assets, f), 'utf8');
    if (f.endsWith('.js')) {
      html = html.replace(new RegExp(`<script[^>]*src="\\./assets/${f.replace('.', '\\.')}"[^>]*></script>`), () => `<script type="module">\n${code}\n</script>`);
    } else if (f.endsWith('.css')) {
      html = html.replace(new RegExp(`<link[^>]*href="\\./assets/${f.replace('.', '\\.')}"[^>]*>`), () => `<style>${code}</style>`);
    }
  }
  if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('還有沒內嵌的檔案');
  mkdirSync(join(root, 'docs'), { recursive: true });
  for (const o of outputs) writeFileSync(join(root, o), html);
  rmSync(out, { recursive: true, force: true });
  console.log(entry, '→', outputs.join(', '), (html.length / 1024).toFixed(0) + ' KB');
}

await pack('brawl.html', ['docs/index.html', '試玩-打人三項.html']);
await pack('br.html', ['docs/race.html']);
