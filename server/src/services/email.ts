import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';

export interface EmailAccount {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface ParsedEmail {
  messageId: string;
  from: { name: string; address: string };
  to: Array<{ name: string; address: string }>;
  cc: Array<{ name: string; address: string }>;
  subject: string;
  date: string;
  textBody: string;
  htmlBody: string;
  snippet: string;
}

const GMAIL_IMAP: Partial<EmailAccount> = {
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
};

const OUTLOOK_IMAP: Partial<EmailAccount> = {
  host: 'outlook.office365.com',
  port: 993,
  secure: true,
};

export function getProviderConfig(provider: string): Partial<EmailAccount> {
  switch (provider) {
    case 'gmail': return GMAIL_IMAP;
    case 'outlook': return OUTLOOK_IMAP;
    default: return {};
  }
}

function parseAddressList(addresses: any): Array<{ name: string; address: string }> {
  if (!addresses) return [];
  const list = addresses.value || addresses;
  if (!Array.isArray(list)) return [];
  return list.map((a: any) => ({
    name: a.name || '',
    address: a.address || '',
  }));
}

export async function testConnection(account: EmailAccount): Promise<boolean> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: account.auth,
    logger: false as any,
  });

  try {
    await client.connect();
    await client.logout();
    return true;
  } catch (err) {
    console.error('IMAP connection test failed:', err);
    return false;
  }
}

export async function fetchRecentEmails(
  account: EmailAccount,
  limit: number = 50,
  sinceDaysAgo: number = 30
): Promise<ParsedEmail[]> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: account.auth,
    logger: false as any,
  });

  const emails: ParsedEmail[] = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDaysAgo);

      const messages = client.fetch(
        { since: sinceDate },
        { source: true, envelope: true, uid: true }
      );

      let count = 0;
      for await (const msg of messages) {
        if (count >= limit) break;

        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source) as ParsedMail;

          const from = parseAddressList(parsed.from);
          const to = parseAddressList(parsed.to);
          const cc = parseAddressList(parsed.cc);

          const textBody = parsed.text || '';
          const snippet = textBody.substring(0, 200).replace(/\s+/g, ' ').trim();

          emails.push({
            messageId: parsed.messageId || msg.uid.toString(),
            from: from[0] || { name: '', address: '' },
            to,
            cc,
            subject: parsed.subject || '(No Subject)',
            date: (parsed.date || new Date()).toISOString(),
            textBody,
            htmlBody: parsed.html || '',
            snippet,
          });

          count++;
        } catch (parseErr) {
          console.error('Failed to parse email:', parseErr);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('Failed to fetch emails:', err);
    throw new Error('Failed to connect to email server. Check your credentials.');
  }

  // Sort newest first
  emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return emails;
}
