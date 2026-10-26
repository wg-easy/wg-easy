import { customType } from 'drizzle-orm/sqlite-core';

/** Preserve the numeric API for single intervals while storing ranges as text. */
export const keepaliveColumn = customType<{
  data: number | string;
  driverData: string;
}>({
  dataType: () => 'text',
  toDriver: (value) => String(value),
  fromDriver: (value) => (/^\d+$/.test(String(value)) ? Number(value) : value),
});
