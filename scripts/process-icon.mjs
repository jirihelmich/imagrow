import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/process-icon.mjs <input.png>');
  process.exit(1);
}

const TARGET = 1024;
const buffer = readFileSync(inputPath);
const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:transparent">
<canvas id="c" width="${TARGET}" height="${TARGET}"></canvas>
<script>
  window._result = null;
  const img = new Image();
  img.onload = () => {
    const canvas = document.getElementById('c');
    canvas.width = ${TARGET};
    canvas.height = ${TARGET};
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, ${TARGET}, ${TARGET});

    const data = ctx.getImageData(0, 0, ${TARGET}, ${TARGET});
    const px = data.data;
    // Black-to-transparent: pure black -> alpha 0, smooth falloff for anti-aliased edges
    for (let i = 0; i < px.length; i += 4) {
      const sum = px[i] + px[i+1] + px[i+2];
      if (sum < 24) {
        px[i+3] = 0;
      } else if (sum < 96) {
        // Linear ramp 24..96 → alpha 0..255
        px[i+3] = Math.round(((sum - 24) / 72) * 255);
      }
    }
    ctx.putImageData(data, 0, 0);
    window._result = canvas.toDataURL('image/png');
  };
  img.onerror = (e) => { window._error = String(e); };
  img.src = '${dataUrl}';
</script>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: TARGET, height: TARGET } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => window._result !== null || window._error, null, { timeout: 30_000 });
  const error = await page.evaluate(() => window._error);
  if (error) throw new Error(error);
  const result = await page.evaluate(() => window._result);
  if (!result || !result.startsWith('data:image/png;base64,')) {
    throw new Error('No PNG produced');
  }
  const out = Buffer.from(result.slice('data:image/png;base64,'.length), 'base64');
  const outPath = path.join(root, 'public', 'img', 'icon.png');
  writeFileSync(outPath, out);
  console.log(`Wrote ${outPath} (${out.length} bytes, ${TARGET}×${TARGET})`);
} finally {
  await browser.close();
}
