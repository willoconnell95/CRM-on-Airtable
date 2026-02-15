import { Tables, getRecords } from './airtable';

interface EnrichmentResult {
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    size?: string;
    location?: string;
    description?: string;
    logo?: string;
  };
  person?: {
    name?: string;
    title?: string;
    linkedin?: string;
    avatar?: string;
    company?: string;
  };
}

/**
 * Enrich contact/company data using Clearbit API.
 * Falls back gracefully if API key is not configured.
 */
export async function enrichByEmail(email: string): Promise<EnrichmentResult> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) {
    return {};
  }

  try {
    const response = await fetch(
      `https://person-stream.clearbit.com/v2/combined/find?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) return {};

    const data: any = await response.json();
    const result: EnrichmentResult = {};

    if (data.person) {
      result.person = {
        name: data.person.name?.fullName,
        title: data.person.employment?.title,
        linkedin: data.person.linkedin?.handle
          ? `https://linkedin.com/in/${data.person.linkedin.handle}`
          : undefined,
        avatar: data.person.avatar,
        company: data.person.employment?.name,
      };
    }

    if (data.company) {
      result.company = {
        name: data.company.name,
        domain: data.company.domain,
        industry: data.company.category?.industry,
        size: data.company.metrics?.employeesRange,
        location: data.company.geo
          ? `${data.company.geo.city}, ${data.company.geo.state}, ${data.company.geo.country}`
          : undefined,
        description: data.company.description,
        logo: data.company.logo,
      };
    }

    return result;
  } catch {
    return {};
  }
}

export async function enrichByDomain(domain: string): Promise<EnrichmentResult> {
  const apiKey = process.env.CLEARBIT_API_KEY;
  if (!apiKey) return {};

  try {
    const response = await fetch(
      `https://company-stream.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) return {};

    const data: any = await response.json();
    return {
      company: {
        name: data.name,
        domain: data.domain,
        industry: data.category?.industry,
        size: data.metrics?.employeesRange,
        location: data.geo
          ? `${data.geo.city}, ${data.geo.state}, ${data.geo.country}`
          : undefined,
        description: data.description,
        logo: data.logo,
      },
    };
  } catch {
    return {};
  }
}

/**
 * Check for duplicate contacts by email
 */
export async function findDuplicateContacts(
  email: string
): Promise<Array<{ id: string; name: string; email: string }>> {
  if (!email) return [];

  const { records } = await getRecords(Tables.Contacts, {
    filterByFormula: `{Email} = '${email.replace(/'/g, "\\'")}'`,
  });

  return records.map((r) => ({
    id: r.id,
    name: r.Name || '',
    email: r.Email || '',
  }));
}

/**
 * Check for duplicate companies by domain
 */
export async function findDuplicateCompanies(
  domain: string
): Promise<Array<{ id: string; name: string; domain: string }>> {
  if (!domain) return [];

  const { records } = await getRecords(Tables.Companies, {
    filterByFormula: `{Domain} = '${domain.replace(/'/g, "\\'")}'`,
  });

  return records.map((r) => ({
    id: r.id,
    name: r.Name || '',
    domain: r.Domain || '',
  }));
}

/**
 * Find connections between a contact and existing contacts
 * based on shared company or shared interactions
 */
export async function findConnections(
  contactId: string,
  companyIds: string[]
): Promise<Array<{ contactId: string; name: string; connection: string }>> {
  const connections: Array<{ contactId: string; name: string; connection: string }> = [];

  if (companyIds.length > 0) {
    for (const companyId of companyIds) {
      const { records } = await getRecords(Tables.Contacts, {
        filterByFormula: `AND(FIND('${companyId}', ARRAYJOIN({Company})), RECORD_ID() != '${contactId}')`,
      });

      for (const r of records) {
        connections.push({
          contactId: r.id,
          name: r.Name || '',
          connection: 'Same company',
        });
      }
    }
  }

  return connections;
}
