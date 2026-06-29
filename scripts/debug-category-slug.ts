import { getCategories, getCategoryBySlug } from '@/server/storefront/catalog';
import { db } from '@/server/db';

async function main() {
  const categories = await getCategories('en');
  const integrated = categories.find((item) => item.slug === 'integrated-stepper-motor');
  const bySlug = await getCategoryBySlug('integrated-stepper-motor', 'en');
  console.log('integrated from list:', integrated ? `${integrated.name} (${integrated.slug}) count=${integrated.productCount}` : 'NOT FOUND');
  console.log('integrated by slug:', bySlug ? `${bySlug.name} (${bySlug.slug}) count=${bySlug.productCount}` : 'NOT FOUND');
  console.log('sample slugs:', categories.slice(0, 5).map((item) => item.slug).join(', '));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
