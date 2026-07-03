import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const settings = await sql`SELECT shipping_country_rates FROM commerce_settings WHERE id = 'default'`;
const rates = settings[0]?.shipping_country_rates ?? [];

const hasAsiaDhl = rates.some(
  (rate) =>
    rate.shippingMethodCode === 'dhl-express'
    && rate.regionCode === 'ASIA'
    && !rate.countryIsoCode,
);

if (hasAsiaDhl) {
  console.log('Asia DHL rate already exists, skipping.');
} else {
  const nextRate = {
    id: `rate-asia-dhl-${randomUUID().slice(0, 8)}`,
    regionCode: 'ASIA',
    regionName: 'Asia',
    countryIsoCode: null,
    countryName: null,
    countryCode: 'ASIA',
    shippingMethodCode: 'dhl-express',
    currencyCode: 'USD',
    rate: 10,
    freeShippingThreshold: null,
    taxRate: 0,
    enabled: true,
    note: 'Regional rate for Asia (country left blank).',
  };

  const nextRates = [...rates, nextRate];
  await sql`
    UPDATE commerce_settings
    SET shipping_country_rates = ${sql.json(nextRates)}, updated_at = now()
    WHERE id = 'default'
  `;
  console.log('Inserted Asia DHL rate:', nextRate);
}

await sql.end();
