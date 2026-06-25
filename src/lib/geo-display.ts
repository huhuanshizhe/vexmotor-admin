export function formatGeoCountryLabel(row: {
  isoAlpha2: string;
  nameEn: string;
  nameZh?: string | null;
}) {
  const zh = row.nameZh ? ` — ${row.nameZh}` : '';
  return `${row.isoAlpha2} — ${row.nameEn}${zh}`;
}
