import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const settings = await sql`SELECT shipping_country_rates FROM commerce_settings WHERE id = 'default'`;
const rates = settings[0]?.shipping_country_rates ?? [];
const dhlRates = rates.filter((r) => (r.shippingMethodCode ?? r.shipping_method_code) === 'dhl-express');
console.log('DHL rates:', JSON.stringify(dhlRates, null, 2));

const cn = await sql`
  SELECT iso_alpha2, continent_code, name_en
  FROM geo_divisions
  WHERE level = 'country' AND iso_alpha2 = 'CN'
  LIMIT 1
`;
console.log('CN geo:', cn);

const countryCount = await sql`
  SELECT count(*)::int AS count
  FROM geo_divisions
  WHERE level = 'country' AND enabled = true
`;
console.log('Country count:', countryCount[0]?.count);

const asiaRates = rates.filter((r) => r.regionCode === 'ASIA' || r.countryCode === 'ASIA');
console.log('Asia rates:', JSON.stringify(asiaRates, null, 2));
console.log('Total rates:', rates.length);
