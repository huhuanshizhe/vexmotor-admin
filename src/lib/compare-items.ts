export const COMPARE_STORAGE_KEY = 'vexmotor-compare-items';
export const COMPARE_ITEMS_UPDATED_EVENT = 'vexmotor:compare-items-updated';

export type CompareItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  priceLabel: string;
  purchaseMode: 'buy' | 'inquiry';
  inStock: boolean;
  shortDescription?: string | null;
  categories: string[];
};

export function readCompareItems() {
  if (typeof window === 'undefined') {
    return [] as CompareItem[];
  }

  const stored = window.localStorage.getItem(COMPARE_STORAGE_KEY);
  if (!stored) {
    return [] as CompareItem[];
  }

  try {
    const parsed = JSON.parse(stored) as CompareItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as CompareItem[];
  }
}

export function writeCompareItems(items: CompareItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items.slice(0, 4)));
  window.dispatchEvent(new Event(COMPARE_ITEMS_UPDATED_EVENT));
}

export function upsertCompareItem(item: CompareItem) {
  const nextItems = [item, ...readCompareItems().filter((entry) => entry.id !== item.id)].slice(0, 4);
  writeCompareItems(nextItems);
  return nextItems;
}

export function removeCompareItem(id: string) {
  const nextItems = readCompareItems().filter((entry) => entry.id !== id);
  writeCompareItems(nextItems);
  return nextItems;
}

export function clearCompareItems() {
  writeCompareItems([]);
  return [] as CompareItem[];
}