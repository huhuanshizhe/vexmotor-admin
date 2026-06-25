/** 配置层存储：0–1 的小数税率（如 0.08 表示 8%） */

export function parseTaxRatePercentInput(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0;

  const text = String(raw).trim().replace(/%$/, '').trim();
  if (!text) return 0;

  const num = Number(text);
  if (!Number.isFinite(num) || num < 0) return 0;

  return Math.min(num / 100, 1);
}

export function decimalToTaxRatePercentValue(decimal: number): number {
  return Number((decimal * 100).toFixed(4));
}

export function formatTaxRatePercent(decimal: number): string {
  const percent = decimal * 100;
  const text = percent.toFixed(2).replace(/\.?0+$/, '');
  return `${text}%`;
}
