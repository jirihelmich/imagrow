import dayjs from 'dayjs';

export function formatDate(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  return dayjs(date).format('D. M. YYYY');
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('D. M. YYYY H:mm');
}

export function hasDecimal(value: string | number | null | undefined): boolean {
  if (!value) return false;
  const s = String(value);
  return s.indexOf(',') > -1 || s.indexOf('.') > -1;
}

export function mmToCm(mm: number | null | undefined): string {
  if (!mm) return '';
  const cm = mm / 10;
  if (!hasDecimal(cm)) return cm + '.0';
  return '' + cm;
}

export function cmToMm(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return NaN;
  const str = typeof value === 'number' ? String(value) : value.replace(',', '.').trim();
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return NaN;
  return Math.round(parsed * 10);
}

export function numerize(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[^\d]*(\d+)[,.]?(\d)?.*/g, '$1$2');
  return parseInt(cleaned);
}
