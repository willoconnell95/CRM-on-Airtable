/**
 * Airtable Schema Setup Script
 *
 * Automatically creates all required tables in your Airtable base
 * using the Airtable Metadata API.
 *
 * Prerequisites:
 * 1. Create a new base in Airtable
 * 2. Create a personal access token with scopes:
 *    data.records:read, data.records:write, schema.bases:read, schema.bases:write
 * 3. Add AIRTABLE_API_KEY and AIRTABLE_BASE_ID to your .env file
 *
 * Run: npm run setup:airtable
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Trim to remove Windows \r characters from .env values
const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID?.trim();

if (!apiKey || !baseId) {
  console.log('='.repeat(60));
  console.log('AIRTABLE SCHEMA SETUP');
  console.log('='.repeat(60));
  console.log('\nPlease set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env\n');
  process.exit(1);
}

// Validate token format
if (!apiKey.startsWith('pat')) {
  console.log('WARNING: Your AIRTABLE_API_KEY does not start with "pat".');
  console.log('The Metadata API requires a Personal Access Token (starts with "pat...").');
  console.log('Legacy API keys (starting with "key") will NOT work.');
  console.log('Create a new token at: https://airtable.com/create/tokens\n');
}

// Debug: show token details
console.log(`Token loaded: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`Token length: ${apiKey.length}`);
console.log(`Token char codes (first 10): ${[...apiKey.substring(0, 10)].map(c => c.charCodeAt(0)).join(',')}`);
console.log(`Token char codes (last 5): ${[...apiKey.substring(apiKey.length - 5)].map(c => c.charCodeAt(0)).join(',')}`);
console.log(`Base ID loaded: ${baseId}`);

// Quick auth test before proceeding
async function testAuth(): Promise<void> {
  console.log('\nTesting auth with /meta/bases endpoint...');
  try {
    const testRes = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log(`Auth test status: ${testRes.status}`);
    if (testRes.ok) {
      const data = await testRes.json();
      console.log(`Auth works! Found ${data.bases?.length ?? 0} base(s)`);
      for (const b of (data.bases || [])) {
        console.log(`  - ${b.name} (${b.id})`);
      }
    } else {
      const text = await testRes.text();
      console.log(`Auth test failed: ${text}`);
      console.log('\nYour token cannot authenticate at all.');
      console.log('Please create a new token at https://airtable.com/create/tokens');
      process.exit(1);
    }
  } catch (e: any) {
    console.log(`Auth test error: ${e.message}`);
  }
  console.log('');
}

interface AirtableField {
  name: string;
  type: string;
  options?: any;
}

interface TableDefinition {
  name: string;
  fields: AirtableField[];
}

// We need to create tables that have linked record fields in a specific order:
// 1. First create tables without link fields (or tables that are link targets)
// 2. Then add link fields afterward

const TABLES_PHASE1: TableDefinition[] = [
  {
    name: 'Contacts',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Email', type: 'email' },
      { name: 'Phone', type: 'phoneNumber' },
      { name: 'Title', type: 'singleLineText' },
      { name: 'LinkedIn', type: 'url' },
      {
        name: 'Tags',
        type: 'multipleSelects',
        options: {
          choices: [
            { name: 'prospect' },
            { name: 'customer' },
            { name: 'partner' },
            { name: 'investor' },
            { name: 'advisor' },
          ],
        },
      },
      { name: 'Relationship Strength', type: 'number', options: { precision: 0 } },
      { name: 'Last Interaction Date', type: 'date', options: { dateFormat: { name: 'iso' } } },
      { name: 'Owner', type: 'singleLineText' },
      { name: 'Notes', type: 'multilineText' },
      { name: 'Avatar', type: 'url' },
    ],
  },
  {
    name: 'Companies',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Domain', type: 'url' },
      {
        name: 'Industry',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Technology' },
            { name: 'Finance' },
            { name: 'Healthcare' },
            { name: 'Education' },
            { name: 'Retail' },
            { name: 'Manufacturing' },
            { name: 'Other' },
          ],
        },
      },
      {
        name: 'Size',
        type: 'singleSelect',
        options: {
          choices: [
            { name: '1-10' },
            { name: '11-50' },
            { name: '51-200' },
            { name: '201-1000' },
            { name: '1001-5000' },
            { name: '5000+' },
          ],
        },
      },
      { name: 'Location', type: 'singleLineText' },
      {
        name: 'Stage',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Prospect' },
            { name: 'Active' },
            { name: 'Customer' },
            { name: 'Partner' },
            { name: 'Churned' },
          ],
        },
      },
      {
        name: 'Tags',
        type: 'multipleSelects',
        options: {
          choices: [
            { name: 'enterprise' },
            { name: 'smb' },
            { name: 'startup' },
            { name: 'strategic' },
          ],
        },
      },
      { name: 'Relationship Strength', type: 'number', options: { precision: 0 } },
      { name: 'Description', type: 'multilineText' },
      { name: 'Logo', type: 'url' },
    ],
  },
  {
    name: 'Interactions',
    fields: [
      { name: 'Subject', type: 'singleLineText' },
      {
        name: 'Type',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'email' },
            { name: 'meeting' },
            { name: 'call' },
            { name: 'note' },
          ],
        },
      },
      {
        name: 'Date',
        type: 'dateTime',
        options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' },
      },
      { name: 'Participants', type: 'singleLineText' },
      { name: 'Notes', type: 'multilineText' },
      {
        name: 'Sentiment',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'positive' },
            { name: 'neutral' },
            { name: 'negative' },
          ],
        },
      },
      { name: 'Auto-Captured', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
      { name: 'Created By', type: 'singleLineText' },
    ],
  },
  {
    name: 'Deals',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      {
        name: 'Stage',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Prospecting' },
            { name: 'Qualification' },
            { name: 'Proposal' },
            { name: 'Negotiation' },
            { name: 'Closed Won' },
            { name: 'Closed Lost' },
          ],
        },
      },
      { name: 'Value', type: 'currency', options: { precision: 2, symbol: '$' } },
      { name: 'Probability', type: 'percent', options: { precision: 0 } },
      { name: 'Close Date', type: 'date', options: { dateFormat: { name: 'iso' } } },
      { name: 'Owner', type: 'singleLineText' },
      { name: 'Tags', type: 'multipleSelects', options: { choices: [] } },
      { name: 'Description', type: 'multilineText' },
    ],
  },
  {
    name: 'Lists',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      {
        name: 'Type',
        type: 'singleSelect',
        options: {
          choices: [{ name: 'contacts' }, { name: 'companies' }],
        },
      },
      { name: 'Filters', type: 'multilineText' },
      { name: 'Owner', type: 'singleLineText' },
      { name: 'Shared With', type: 'multilineText' },
    ],
  },
  {
    name: 'Relationships',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Connection Strength', type: 'number', options: { precision: 0 } },
      { name: 'Shared Interactions', type: 'number', options: { precision: 0 } },
      { name: 'Introduction Path', type: 'multilineText' },
    ],
  },
  {
    name: 'Activities',
    fields: [
      { name: 'Details', type: 'singleLineText' },
      { name: 'User', type: 'singleLineText' },
      {
        name: 'Action Type',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'created' },
            { name: 'updated' },
            { name: 'deleted' },
            { name: 'logged' },
            { name: 'stage_changed' },
          ],
        },
      },
      {
        name: 'Entity Type',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'contact' },
            { name: 'company' },
            { name: 'deal' },
            { name: 'interaction' },
            { name: 'list' },
          ],
        },
      },
      { name: 'Entity ID', type: 'singleLineText' },
      { name: 'Entity Name', type: 'singleLineText' },
      {
        name: 'Timestamp',
        type: 'dateTime',
        options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' },
      },
    ],
  },
  {
    name: 'Users',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Email', type: 'email' },
      {
        name: 'Role',
        type: 'singleSelect',
        options: {
          choices: [{ name: 'admin' }, { name: 'member' }, { name: 'viewer' }],
        },
      },
      { name: 'PasswordHash', type: 'multilineText' },
      { name: 'Avatar', type: 'url' },
    ],
  },
  {
    name: 'PipelineStages',
    fields: [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Order', type: 'number', options: { precision: 0 } },
      { name: 'Color', type: 'singleLineText' },
      { name: 'Weight', type: 'number', options: { precision: 2 } },
    ],
  },
];

const API_BASE = 'https://api.airtable.com/v0';

async function apiRequest(url: string, method: string, body?: any): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable API ${method} ${url} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function getExistingTables(): Promise<Map<string, string>> {
  const data = await apiRequest(`${API_BASE}/meta/bases/${baseId}/tables`, 'GET');
  const map = new Map<string, string>();
  for (const table of data.tables) {
    map.set(table.name, table.id);
  }
  return map;
}

async function createTable(def: TableDefinition): Promise<string> {
  const body = {
    name: def.name,
    fields: def.fields,
  };
  const data = await apiRequest(`${API_BASE}/meta/bases/${baseId}/tables`, 'POST', body);
  return data.id;
}

async function addFieldToTable(tableId: string, field: AirtableField): Promise<void> {
  await apiRequest(`${API_BASE}/meta/bases/${baseId}/tables/${tableId}/fields`, 'POST', field);
}

// Small delay to avoid rate limits
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('AIRTABLE AUTO-SETUP');
  console.log('='.repeat(60));
  console.log(`\nBase ID: ${baseId}\n`);

  // Test auth first
  await testAuth();

  // Check existing tables
  console.log('Checking existing tables...\n');
  const existing = await getExistingTables();

  if (existing.size > 0) {
    console.log('Found existing tables:');
    for (const name of existing.keys()) {
      console.log(`  - ${name}`);
    }
    console.log('');
  }

  // Phase 1: Create tables (without link fields)
  const tableIds = new Map<string, string>();

  for (const def of TABLES_PHASE1) {
    if (existing.has(def.name)) {
      console.log(`  ✓ ${def.name} - already exists`);
      tableIds.set(def.name, existing.get(def.name)!);
    } else {
      try {
        const id = await createTable(def);
        tableIds.set(def.name, id);
        console.log(`  ✓ ${def.name} - created`);
        await delay(300);
      } catch (err: any) {
        console.log(`  ✗ ${def.name} - ERROR: ${err.message}`);
        process.exit(1);
      }
    }
  }

  // Phase 2: Add linked record fields
  // These need the table IDs from phase 1
  console.log('\nAdding linked record fields...\n');

  const contactsId = tableIds.get('Contacts')!;
  const companiesId = tableIds.get('Companies')!;

  const linkFields: Array<{ tableName: string; tableId: string; field: AirtableField }> = [
    {
      tableName: 'Contacts',
      tableId: contactsId,
      field: {
        name: 'Company',
        type: 'multipleRecordLinks',
        options: { linkedTableId: companiesId },
      },
    },
    {
      tableName: 'Interactions',
      tableId: tableIds.get('Interactions')!,
      field: {
        name: 'Contact',
        type: 'multipleRecordLinks',
        options: { linkedTableId: contactsId },
      },
    },
    {
      tableName: 'Interactions',
      tableId: tableIds.get('Interactions')!,
      field: {
        name: 'Company',
        type: 'multipleRecordLinks',
        options: { linkedTableId: companiesId },
      },
    },
    {
      tableName: 'Deals',
      tableId: tableIds.get('Deals')!,
      field: {
        name: 'Company',
        type: 'multipleRecordLinks',
        options: { linkedTableId: companiesId },
      },
    },
    {
      tableName: 'Deals',
      tableId: tableIds.get('Deals')!,
      field: {
        name: 'Contacts',
        type: 'multipleRecordLinks',
        options: { linkedTableId: contactsId },
      },
    },
    {
      tableName: 'Relationships',
      tableId: tableIds.get('Relationships')!,
      field: {
        name: 'Person A',
        type: 'multipleRecordLinks',
        options: { linkedTableId: contactsId },
      },
    },
    {
      tableName: 'Relationships',
      tableId: tableIds.get('Relationships')!,
      field: {
        name: 'Person B',
        type: 'multipleRecordLinks',
        options: { linkedTableId: contactsId },
      },
    },
  ];

  for (const link of linkFields) {
    // Skip if the table was pre-existing (fields may already be there)
    if (existing.has(link.tableName)) {
      console.log(`  ~ ${link.tableName}.${link.field.name} - skipped (table pre-existed)`);
      continue;
    }
    try {
      await addFieldToTable(link.tableId, link.field);
      console.log(`  ✓ ${link.tableName}.${link.field.name} - added`);
      await delay(300);
    } catch (err: any) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`  ~ ${link.tableName}.${link.field.name} - already exists`);
      } else {
        console.log(`  ✗ ${link.tableName}.${link.field.name} - ERROR: ${err.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Setup complete! You can now run: npm run dev');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
