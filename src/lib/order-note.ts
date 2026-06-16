export function parseOrderNote(note: string | null | undefined) {
  const lines = (note ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

  const poNumber = lines.find((line) => line.startsWith('PO Number:'))?.replace('PO Number:', '').trim() ?? null;
  const taxId = lines.find((line) => line.startsWith('Tax ID / VAT:'))?.replace('Tax ID / VAT:', '').trim() ?? null;
  const requestedShipDate = lines.find((line) => line.startsWith('Requested Ship Date:'))?.replace('Requested Ship Date:', '').trim() ?? null;
  const tradeTerm = lines.find((line) => line.startsWith('Trade Term:'))?.replace('Trade Term:', '').trim() ?? null;
  const contactEmail = lines.find((line) => line.startsWith('Contact Email:'))?.replace('Contact Email:', '').trim() ?? null;
  const subscribeToUpdates = lines.includes('Engineering Updates: Yes');
  const restrictedEndUseConfirmed = lines.includes('Restricted End Use Confirmed: Yes');

  const narrative = lines
    .filter(
      (line) =>
        !line.startsWith('PO Number:') &&
        !line.startsWith('Tax ID / VAT:') &&
        !line.startsWith('Requested Ship Date:') &&
        !line.startsWith('Trade Term:') &&
        !line.startsWith('Contact Email:') &&
        line !== 'Engineering Updates: Yes' &&
        line !== 'Restricted End Use Confirmed: Yes',
    )
    .join('\n');

  return {
    poNumber,
    taxId,
    requestedShipDate,
    tradeTerm,
    contactEmail,
    subscribeToUpdates,
    restrictedEndUseConfirmed,
    narrative: narrative || null,
  };
}