import { useState } from 'react';
import {
  useEmailStatus,
  useConnectEmail,
  useDisconnectEmail,
  useSyncEmails,
  useImportContact,
  useLogEmailInteraction,
  useBulkImportEmails,
  useCreateDealFromInteraction,
} from '@/hooks/useEmail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, getSentimentColor } from '@/lib/utils';
import type { SyncedEmail } from '@/types';
import {
  Mail,
  MailPlus,
  Plug,
  PlugZap,
  RefreshCw,
  UserPlus,
  Target,
  Check,
  AlertTriangle,
  ArrowRight,
  Download,
  Zap,
} from 'lucide-react';

export function EmailPage() {
  const { data: status, isLoading: statusLoading } = useEmailStatus();
  const connectEmail = useConnectEmail();
  const disconnectEmail = useDisconnectEmail();
  const syncEmails = useSyncEmails();
  const importContact = useImportContact();
  const logInteraction = useLogEmailInteraction();
  const bulkImport = useBulkImportEmails();
  const createDeal = useCreateDealFromInteraction();

  const [showConnect, setShowConnect] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SyncedEmail | null>(null);
  const [syncedEmails, setSyncedEmails] = useState<SyncedEmail[]>([]);
  const [importedEmails, setImportedEmails] = useState<Set<string>>(new Set());
  const [importedContacts, setImportedContacts] = useState<Set<string>>(new Set());

  const [connectForm, setConnectForm] = useState({
    provider: 'gmail',
    email: '',
    password: '',
    host: '',
    port: '',
  });

  const [dealForm, setDealForm] = useState({
    Name: '',
    Stage: 'Prospecting',
    Value: 0,
    Probability: 10,
    'Close Date': '',
    Description: '',
  });

  const [bulkResult, setBulkResult] = useState<{ contactsCreated: number; contactsExisted: number; interactionsLogged: number } | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    try {
      await connectEmail.mutateAsync({
        provider: connectForm.provider,
        email: connectForm.email,
        password: connectForm.password,
        host: connectForm.host || undefined,
        port: connectForm.port ? Number(connectForm.port) : undefined,
      });
      setShowConnect(false);
      setConnectForm({ provider: 'gmail', email: '', password: '', host: '', port: '' });
    } catch {}
  }

  async function handleSync() {
    try {
      const result = await syncEmails.mutateAsync({ limit: 50, sinceDays: 14 });
      setSyncedEmails(result.emails);
    } catch {}
  }

  async function handleImportContact(contact: { name: string; email: string }, source: string) {
    try {
      await importContact.mutateAsync({ name: contact.name, email: contact.email, source });
      setImportedContacts(prev => new Set(prev).add(contact.email));
    } catch {}
  }

  async function handleLogInteraction(email: SyncedEmail) {
    try {
      await logInteraction.mutateAsync({
        subject: email.subject,
        date: email.date,
        from: email.from.address,
        to: email.to.map(t => t.address),
        snippet: email.snippet,
        sentiment: email.sentiment,
      });
      setImportedEmails(prev => new Set(prev).add(email.messageId));
    } catch {}
  }

  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmail) return;
    try {
      await createDeal.mutateAsync({
        Name: dealForm.Name,
        Stage: dealForm.Stage,
        Value: dealForm.Value,
        Probability: dealForm.Probability,
        'Close Date': dealForm['Close Date'],
        Description: dealForm.Description || `Created from email: ${selectedEmail.subject}`,
      });
      setShowDealForm(false);
      setSelectedEmail(null);
      setDealForm({ Name: '', Stage: 'Prospecting', Value: 0, Probability: 10, 'Close Date': '', Description: '' });
    } catch {}
  }

  async function handleBulkImport() {
    try {
      const result = await bulkImport.mutateAsync({ emails: syncedEmails });
      setBulkResult(result);
      syncedEmails.forEach(e => {
        setImportedEmails(prev => new Set(prev).add(e.messageId));
      });
    } catch {}
  }

  function openDealForm(email: SyncedEmail) {
    setSelectedEmail(email);
    setDealForm({
      Name: email.dealSignal.suggestedName,
      Stage: email.dealSignal.suggestedStage,
      Value: 0,
      Probability: Math.min(Math.max(email.dealSignal.score, 5), 90),
      'Close Date': '',
      Description: `From email: ${email.subject}\n\n${email.snippet}`,
    });
    setShowDealForm(true);
  }

  if (statusLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Integration</h1>
          <p className="text-sm text-gray-500 mt-1">Sync emails to auto-capture contacts, log interactions, and create deals</p>
        </div>
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <>
              <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1.5">
                <PlugZap className="h-3 w-3" />
                {status.email}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => disconnectEmail.mutate()}>
                Disconnect
              </Button>
              <Button onClick={handleSync} disabled={syncEmails.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncEmails.isPending ? 'animate-spin' : ''}`} />
                {syncEmails.isPending ? 'Syncing...' : 'Sync Emails'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setShowConnect(true)}>
              <Plug className="mr-2 h-4 w-4" /> Connect Email
            </Button>
          )}
        </div>
      </div>

      {/* Bulk import bar */}
      {syncedEmails.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-indigo-50 border-indigo-200 p-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-900">{syncedEmails.length} emails synced</p>
              <p className="text-xs text-indigo-600">Import all contacts and log all as interactions in one click</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {bulkResult && (
              <span className="text-xs text-indigo-700">
                {bulkResult.contactsCreated} new contacts, {bulkResult.interactionsLogged} interactions logged
              </span>
            )}
            <Button size="sm" onClick={handleBulkImport} disabled={bulkImport.isPending}>
              <Zap className="mr-2 h-4 w-4" />
              {bulkImport.isPending ? 'Importing...' : 'Bulk Import All'}
            </Button>
          </div>
        </div>
      )}

      {/* Email list */}
      {!status?.connected ? (
        <EmptyState
          icon={<Mail className="h-12 w-12" />}
          title="Connect your email"
          description="Link your Gmail or Outlook account to automatically capture contacts, log interactions, and spot deal opportunities from your inbox."
          actionLabel="Connect Email"
          onAction={() => setShowConnect(true)}
        />
      ) : syncedEmails.length === 0 ? (
        <EmptyState
          icon={<MailPlus className="h-12 w-12" />}
          title="Ready to sync"
          description='Click "Sync Emails" to fetch your recent emails and discover contacts and deals.'
          actionLabel="Sync Now"
          onAction={handleSync}
        />
      ) : (
        <div className="space-y-3">
          {syncedEmails.map((email) => {
            const isImported = importedEmails.has(email.messageId);
            const hasDealSignal = email.dealSignal.score >= 20;

            return (
              <div key={email.messageId} className="rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Left: email info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{email.subject}</span>
                      <Badge className={`text-xs ${getSentimentColor(email.sentiment)}`} variant="outline">
                        {email.sentiment}
                      </Badge>
                      {hasDealSignal && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 gap-1">
                          <Target className="h-3 w-3" />
                          Deal {email.dealSignal.score}%
                        </Badge>
                      )}
                      {isImported && (
                        <Badge className="text-xs bg-green-100 text-green-700 gap-1">
                          <Check className="h-3 w-3" /> Logged
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span className="font-medium">{email.from.name || email.from.address}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{email.to.map(t => t.name || t.address).join(', ')}</span>
                      <span className="ml-auto">{formatDate(email.date)}</span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">{email.snippet}</p>

                    {/* Extracted contacts */}
                    {email.extractedContacts.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-xs text-gray-400">Contacts:</span>
                        {email.extractedContacts.map((c) => (
                          <button
                            key={c.email}
                            onClick={() => handleImportContact(c, email.subject)}
                            disabled={importedContacts.has(c.email) || importContact.isPending}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {importedContacts.has(c.email) ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <UserPlus className="h-3 w-3" />
                            )}
                            {c.name || c.email}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Deal signal keywords */}
                    {hasDealSignal && email.dealSignal.keywords.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-amber-600">Deal signals:</span>
                        {email.dealSignal.keywords.slice(0, 5).map((kw) => (
                          <span key={kw} className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLogInteraction(email)}
                      disabled={isImported || logInteraction.isPending}
                    >
                      <Mail className="mr-1 h-3 w-3" />
                      {isImported ? 'Logged' : 'Log'}
                    </Button>
                    {hasDealSignal && (
                      <Button
                        size="sm"
                        onClick={() => openDealForm(email)}
                      >
                        <Target className="mr-1 h-3 w-3" />
                        Deal
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect email dialog */}
      <Dialog open={showConnect} onClose={() => setShowConnect(false)}>
        <DialogHeader><DialogTitle>Connect Email Account</DialogTitle></DialogHeader>
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Provider</label>
            <Select value={connectForm.provider} onChange={(e) => setConnectForm({ ...connectForm, provider: e.target.value })}>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook / Office 365</option>
              <option value="custom">Custom IMAP</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email Address</label>
            <Input
              type="email"
              value={connectForm.email}
              onChange={(e) => setConnectForm({ ...connectForm, email: e.target.value })}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {connectForm.provider === 'gmail' ? 'App Password' : 'Password'}
            </label>
            <Input
              type="password"
              value={connectForm.password}
              onChange={(e) => setConnectForm({ ...connectForm, password: e.target.value })}
              required
              placeholder={connectForm.provider === 'gmail' ? 'Generate at myaccount.google.com/apppasswords' : 'Your email password'}
            />
            {connectForm.provider === 'gmail' && (
              <p className="mt-1 text-xs text-gray-500">
                Gmail requires an App Password. Go to Google Account &gt; Security &gt; App Passwords to generate one.
              </p>
            )}
          </div>
          {connectForm.provider === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">IMAP Host</label>
                <Input
                  value={connectForm.host}
                  onChange={(e) => setConnectForm({ ...connectForm, host: e.target.value })}
                  placeholder="imap.example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Port</label>
                <Input
                  type="number"
                  value={connectForm.port}
                  onChange={(e) => setConnectForm({ ...connectForm, port: e.target.value })}
                  placeholder="993"
                />
              </div>
            </div>
          )}
          {connectEmail.isError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {(connectEmail.error as Error).message}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowConnect(false)}>Cancel</Button>
            <Button type="submit" disabled={connectEmail.isPending}>
              {connectEmail.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Create deal from email dialog */}
      <Dialog open={showDealForm} onClose={() => setShowDealForm(false)}>
        <DialogHeader>
          <DialogTitle>Create Deal from Email</DialogTitle>
        </DialogHeader>
        {selectedEmail && (
          <div className="mb-4 rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500">From email:</p>
            <p className="text-sm font-medium">{selectedEmail.subject}</p>
            <p className="text-xs text-gray-500 mt-1">
              {selectedEmail.from.name || selectedEmail.from.address} &mdash; {formatDate(selectedEmail.date)}
            </p>
          </div>
        )}
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Deal Name</label>
            <Input
              value={dealForm.Name}
              onChange={(e) => setDealForm({ ...dealForm, Name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Stage</label>
              <Select value={dealForm.Stage} onChange={(e) => setDealForm({ ...dealForm, Stage: e.target.value })}>
                <option value="Prospecting">Prospecting</option>
                <option value="Qualification">Qualification</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed Won">Closed Won</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Value ($)</label>
              <Input
                type="number"
                value={dealForm.Value}
                onChange={(e) => setDealForm({ ...dealForm, Value: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Probability (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={dealForm.Probability}
                onChange={(e) => setDealForm({ ...dealForm, Probability: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Close Date</label>
              <Input
                type="date"
                value={dealForm['Close Date']}
                onChange={(e) => setDealForm({ ...dealForm, 'Close Date': e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowDealForm(false)}>Cancel</Button>
            <Button type="submit" disabled={createDeal.isPending}>
              {createDeal.isPending ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
