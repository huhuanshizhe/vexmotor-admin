import type { VolumePricingRuleConfig } from '@/lib/commerce-config';
import { decimalToTaxRatePercentValue, formatTaxRatePercent, parseTaxRatePercentInput } from '@/lib/tax-rate';

/** 阶梯定价最低起订量（批发；单件购买不走阶梯价） */
export const MIN_VOLUME_PRICING_QUANTITY = 2;

/** 优惠幅度百分数 → priceFactor（如 7 → 0.93；0 或未填 → 1） */
export function parseDiscountPercentToPriceFactor(percent: string | number | null | undefined): number {
  const discountDecimal = parseTaxRatePercentInput(percent);
  return Number(Math.max(0, 1 - discountDecimal).toFixed(4));
}

/** priceFactor → 优惠幅度百分数值（如 0.93 → 7） */
export function priceFactorToDiscountPercentValue(priceFactor: number): number {
  return decimalToTaxRatePercentValue(1 - priceFactor);
}

/** priceFactor → 展示文案（如 "7%"） */
export function formatDiscountPercent(priceFactor: number): string {
  return formatTaxRatePercent(1 - priceFactor);
}

export function buildVolumePricingLabel(label: string | null | undefined, minQuantity: number) {
  const normalized = label?.trim();
  return normalized || `Tier ${minQuantity}`;
}

export function validateVolumePricingDiscountPercent(
  discountPercent: string | number | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (discountPercent == null || discountPercent === '') {
    return { ok: false, message: '请填写优惠幅度' };
  }

  const percent = Number(discountPercent);
  if (!Number.isFinite(percent) || percent <= 0) {
    return { ok: false, message: '优惠幅度必须大于 0' };
  }

  if (percent > 100) {
    return { ok: false, message: '优惠幅度不能超过 100%' };
  }

  return { ok: true };
}

export function validateVolumePricingMinQuantity(
  rules: Array<Pick<VolumePricingRuleConfig, 'id' | 'minQuantity'>>,
  input: { minQuantity: number; editingId?: string | null },
): { ok: true } | { ok: false; message: string } {
  const minQuantity = Math.trunc(Number(input.minQuantity));
  if (!Number.isFinite(minQuantity) || minQuantity < MIN_VOLUME_PRICING_QUANTITY) {
    return { ok: false, message: `起订数量必须是大于 1 的整数（至少 ${MIN_VOLUME_PRICING_QUANTITY}）` };
  }

  const duplicate = rules.some(
    (rule) => rule.minQuantity === minQuantity && rule.id !== input.editingId,
  );
  if (duplicate) {
    return { ok: false, message: '该起订数量已存在，请使用其他数量' };
  }

  return { ok: true };
}
