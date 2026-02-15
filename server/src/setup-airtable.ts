/**
 * Airtable Schema Setup Script
 *
 * This script documents the required Airtable schema.
 * Since Airtable doesn't support programmatic table creation via the standard API,
 * this serves as a reference and validator.
 *
 * To set up your Airtable base:
 * 1. Create a new base in Airtable
 * 2. Create the tables below with the specified fields
 * 3. Add the base ID and API key to your .env file
 *
 * Run this script to validate your setup: npm run setup:airtable
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.log('='.repeat(60));
  console.log('AIRTABLE SCHEMA SETUP GUIDE');
  console.log('='.repeat(60));
  console.log('\nPlease set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env\n');
}

console.log(`
=== REQUIRED AIRTABLE SCHEMA ===

Create the following tables in your Airtable base:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Contacts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Name              (Single line text) [Primary]
  - Email             (Email)
  - Phone             (Phone number)
  - Company           (Link to Companies)
  - Title             (Single line text)
  - LinkedIn          (URL)
  - Tags              (Multiple select) - Add options: prospect, customer, partner, investor, advisor
  - Relationship Strength (Number, integer 0-100)
  - Last Interaction Date (Date)
  - Owner             (Single line text)
  - Notes             (Long text)
  - Avatar            (URL)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Companies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Name              (Single line text) [Primary]
  - Domain            (URL)
  - Industry          (Single select) - Add options: Technology, Finance, Healthcare, Education, Retail, Manufacturing, Other
  - Size              (Single select) - Add options: 1-10, 11-50, 51-200, 201-1000, 1001-5000, 5000+
  - Location          (Single line text)
  - Stage             (Single select) - Add options: Prospect, Active, Customer, Partner, Churned
  - Tags              (Multiple select) - Add options: enterprise, smb, startup, strategic
  - Relationship Strength (Number, integer 0-100)
  - Description       (Long text)
  - Logo              (URL)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Interactions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Subject           (Single line text) [Primary]
  - Type              (Single select) - Options: email, meeting, call, note
  - Date              (Date with time)
  - Contact           (Link to Contacts)
  - Company           (Link to Companies)
  - Participants      (Single line text)
  - Notes             (Long text, enable rich text)
  - Sentiment         (Single select) - Options: positive, neutral, negative
  - Auto-Captured     (Checkbox)
  - Created By        (Single line text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Deals
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Name              (Single line text) [Primary]
  - Company           (Link to Companies)
  - Contacts          (Link to Contacts)
  - Stage             (Single select) - Options: Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost
  - Value             (Currency, USD)
  - Probability       (Percent)
  - Close Date        (Date)
  - Owner             (Single line text)
  - Tags              (Multiple select)
  - Description       (Long text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Lists
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Name              (Single line text) [Primary]
  - Type              (Single select) - Options: contacts, companies
  - Filters           (Long text) - JSON string
  - Owner             (Single line text)
  - Shared With       (Multiple select or Long text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Relationships
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Name              (Formula: concatenate Person A & Person B names) [Primary]
  - Person A          (Link to Contacts)
  - Person B          (Link to Contacts)
  - Connection Strength (Number, integer 0-100)
  - Shared Interactions (Number, integer)
  - Introduction Path (Long text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Activities
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Details           (Single line text) [Primary]
  - User              (Single line text)
  - Action Type       (Single select) - Options: created, updated, deleted, logged, stage_changed
  - Entity Type       (Single select) - Options: contact, company, deal, interaction, list
  - Entity ID         (Single line text)
  - Entity Name       (Single line text)
  - Timestamp         (Date with time)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE: Users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fields:
  - Name              (Single line text) [Primary]
  - Email             (Email)
  - Role              (Single select) - Options: admin, member, viewer
  - PasswordHash      (Long text)
  - Avatar            (URL)
`);

// Validate connection if credentials are provided
if (apiKey && baseId) {
  console.log('\nValidating Airtable connection...\n');

  Airtable.configure({ apiKey });
  const base = Airtable.base(baseId);

  const tablesToCheck = ['Contacts', 'Companies', 'Interactions', 'Deals', 'Lists', 'Relationships', 'Activities', 'Users'];

  Promise.all(
    tablesToCheck.map(async (tableName) => {
      try {
        await new Promise<void>((resolve, reject) => {
          base(tableName)
            .select({ maxRecords: 1 })
            .firstPage((err) => {
              if (err) reject(err);
              else resolve();
            });
        });
        console.log(`  ✓ ${tableName} - OK`);
        return true;
      } catch (err: any) {
        console.log(`  ✗ ${tableName} - NOT FOUND or ERROR: ${err.message}`);
        return false;
      }
    })
  ).then((results) => {
    const allOk = results.every(Boolean);
    console.log(`\n${allOk ? '✓ All tables validated!' : '✗ Some tables are missing. Please create them in Airtable.'}`);
    process.exit(allOk ? 0 : 1);
  });
} else {
  console.log('\nSet AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env, then re-run to validate.');
  process.exit(0);
}
