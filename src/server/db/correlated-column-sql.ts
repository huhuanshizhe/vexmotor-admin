import { getTableName, sql, type Column, type SQL } from 'drizzle-orm';

/** Qualify a table column for correlated subqueries in SELECT lists that also project `id`. */
export function correlatedColumnSql(column: Column): SQL {
  return sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
}
