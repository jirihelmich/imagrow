interface ExportOptions {
  title?: string;
  background?: string;
  scale?: number;
}

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function inlineSvgFont(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const svgNS = 'http://www.w3.org/2000/svg';
  const style = document.createElementNS(svgNS, 'style');
  style.textContent = `text { font-family: ${FONT_FAMILY}; }`;
  clone.insertBefore(style, clone.firstChild);
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', svgNS);
  return clone;
}

function svgToImage(svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> {
  const clone = inlineSvgFont(svg);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export async function chartToPngBlob(svg: SVGSVGElement, options: ExportOptions = {}): Promise<Blob> {
  const { title, background = '#ffffff', scale = 2 } = options;
  const rect = svg.getBoundingClientRect();
  const chartWidth = Math.max(1, Math.round(rect.width));
  const chartHeight = Math.max(1, Math.round(rect.height));
  const titleHeight = title ? 36 : 0;

  const img = await svgToImage(svg, chartWidth, chartHeight);

  const canvas = document.createElement('canvas');
  canvas.width = chartWidth * scale;
  canvas.height = (chartHeight + titleHeight) * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, chartWidth, chartHeight + titleHeight);

  if (title) {
    ctx.fillStyle = '#1f2937';
    ctx.font = `600 14px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, chartWidth / 2, titleHeight / 2);
  }

  ctx.drawImage(img, 0, titleHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function sanitizeFilename(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}
