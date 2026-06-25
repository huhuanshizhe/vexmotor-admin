import { listGeoCountries } from '@/server/geo/divisions';
import { listAdminCustomers } from '@/server/admin/customers';

import { parseCustomerListQuery } from '@/lib/customer-list-query';

import { CustomerListClient } from '@/components/customers/customer-list-client';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseCustomerListQuery(params);

  const [listResult, countries] = await Promise.all([
    listAdminCustomers(query),
    listGeoCountries(),
  ]);

  const countryOptions = countries.map((item) => ({
    value: item.isoAlpha2,
    label: item.label,
  }));

  const countryLabelByCode = Object.fromEntries(
    countries.map((item) => [item.isoAlpha2, item.label]),
  );

  return (
    <CustomerListClient
      initialList={{
        items: listResult.items,
        total: listResult.total,
        page: listResult.page,
        pageSize: listResult.pageSize,
      }}
      initialQuery={query}
      countryOptions={countryOptions}
      countryLabelByCode={countryLabelByCode}
    />
  );
}
