'use client';

import { useEffect, useState } from 'react';

import { formatGeoCountryLabel } from '@/lib/geo-display';

type StoredCountryLabelProps = {
  value: string | null | undefined;
  locale?: 'en' | 'bilingual';
};

export function StoredCountryLabel({ value, locale = 'bilingual' }: StoredCountryLabelProps) {
  const [label, setLabel] = useState(value?.trim() || '未填写');

  useEffect(() => {
    const trimmed = value?.trim();
    if (!trimmed) {
      setLabel('未填写');
      return;
    }

    let cancelled = false;
    void fetch('/api/front/geo/countries')
      .then((response) => response.json())
      .then((data: { items: Array<{ isoAlpha2: string; nameEn: string; nameZh?: string | null }> }) => {
        if (cancelled) {
          return;
        }

        const byIso = data.items.find((item) => item.isoAlpha2.toUpperCase() === trimmed.toUpperCase());
        if (byIso) {
          setLabel(
            locale === 'en'
              ? byIso.nameEn
              : formatGeoCountryLabel({ isoAlpha2: byIso.isoAlpha2, nameEn: byIso.nameEn, nameZh: byIso.nameZh }),
          );
          return;
        }

        const byName = data.items.find((item) => item.nameEn.toLowerCase() === trimmed.toLowerCase());
        if (byName) {
          setLabel(
            locale === 'en'
              ? byName.nameEn
              : formatGeoCountryLabel({ isoAlpha2: byName.isoAlpha2, nameEn: byName.nameEn, nameZh: byName.nameZh }),
          );
          return;
        }

        setLabel(trimmed);
      })
      .catch(() => {
        if (!cancelled) {
          setLabel(trimmed);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, value]);

  return <>{label}</>;
}
