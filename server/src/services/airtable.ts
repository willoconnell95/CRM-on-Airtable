import Airtable from 'airtable';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

dotenv.config({ path: '../.env' });

const apiKey = process.env.AIRTABLE_API_KEY || '';
const baseId = process.env.AIRTABLE_BASE_ID || '';

Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// Cache with 60 second TTL
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export const Tables = {
  Contacts: 'Contacts',
  Companies: 'Companies',
  Interactions: 'Interactions',
  Deals: 'Deals',
  Lists: 'Lists',
  Relationships: 'Relationships',
  Activities: 'Activities',
  Users: 'Users',
} as const;

type TableName = (typeof Tables)[keyof typeof Tables];

interface QueryOptions {
  filterByFormula?: string;
  sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
  fields?: string[];
  view?: string;
}

export async function getRecords(
  table: TableName,
  options: QueryOptions = {}
): Promise<{ records: any[]; offset?: string }> {
  const cacheKey = `${table}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached as any;

  const query: any = {};
  if (options.filterByFormula) query.filterByFormula = options.filterByFormula;
  if (options.sort) query.sort = options.sort;
  if (options.maxRecords) query.maxRecords = options.maxRecords;
  if (options.pageSize) query.pageSize = options.pageSize;
  if (options.fields) query.fields = options.fields;
  if (options.view) query.view = options.view;

  const records: any[] = [];

  await new Promise<void>((resolve, reject) => {
    base(table)
      .select(query)
      .eachPage(
        (pageRecords, fetchNextPage) => {
          records.push(
            ...pageRecords.map((r) => ({
              id: r.id,
              ...r.fields,
            }))
          );
          fetchNextPage();
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
  });

  const result = { records };
  cache.set(cacheKey, result);
  return result;
}

export async function getRecord(table: TableName, id: string): Promise<any> {
  const cacheKey = `${table}:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const record = await base(table).find(id);
  const result = { id: record.id, ...record.fields };
  cache.set(cacheKey, result);
  return result;
}

export async function createRecord(
  table: TableName,
  fields: Record<string, any>
): Promise<any> {
  const record = await base(table).create(fields);
  invalidateTableCache(table);
  return { id: record.id, ...record.fields };
}

export async function createRecords(
  table: TableName,
  recordsData: Array<{ fields: Record<string, any> }>
): Promise<any[]> {
  const created: any[] = [];
  // Airtable API allows max 10 records per batch
  for (let i = 0; i < recordsData.length; i += 10) {
    const batch = recordsData.slice(i, i + 10);
    const records = await base(table).create(batch);
    created.push(...records.map((r) => ({ id: r.id, ...r.fields })));
  }
  invalidateTableCache(table);
  return created;
}

export async function updateRecord(
  table: TableName,
  id: string,
  fields: Record<string, any>
): Promise<any> {
  const record = await base(table).update(id, fields);
  invalidateTableCache(table);
  cache.del(`${table}:${id}`);
  return { id: record.id, ...record.fields };
}

export async function deleteRecord(table: TableName, id: string): Promise<void> {
  await base(table).destroy(id);
  invalidateTableCache(table);
  cache.del(`${table}:${id}`);
}

export async function deleteRecords(table: TableName, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    await base(table).destroy(batch);
  }
  invalidateTableCache(table);
}

function invalidateTableCache(table: string): void {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.startsWith(`${table}:`)) {
      cache.del(key);
    }
  }
}

export function clearCache(): void {
  cache.flushAll();
}

export { base };
