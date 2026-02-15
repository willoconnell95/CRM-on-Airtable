import { useState } from 'react';
import { useInteractions, useCreateInteraction, useDeleteInteraction } from '@/hooks/useInteractions';
import { useCreateDealFromInteraction } from '@/hooks/useEmail';
import { useStages } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, getSentimentColor } from '@/lib/utils';
import type { Interaction } from '@/types';
import { DEFAULT_STAGES } from '@/types';
import { Plus, MessageSquare, Mail, Phone, Users, FileText, Trash2, Filter, Target } from 'lucide-react';

const typeIcons: Record<string, any> = {
  email: Mail,
  meeting: Users,
  call: Phone,
  note: FileText,
};

const typeColors: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  meeting: 'bg-purple-100 text-purple-700',
  call: 'bg-green-100 text-green-700',
  note: 'bg-amber-100 text-amber-700',
};

export function InteractionsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const { data: interactions, isLoading } = useInteractions(
    typeFilter ? { type: typeFilter } : undefined
  );
  const createInteraction = useCreateInteraction();
  const deleteInteraction = useDeleteInteraction();
  const createDeal = useCreateDealFromInteraction();
  const { data: stages } = useStages();
  const activeStages = stages || DEFAULT_STAGES;

  const [form, setForm] = useState({
    Type: 'note' as string,
    Subject: '',
    Notes: '',
    Sentiment: 'neutral' as string,
    Date: new Date().toISOString().split('T')[0],
    Participants: '',
  });

  const [dealForm, setDealForm] = useState({
    Name: '',
    Stage: 'Prospecting',
    Value: 0,
    Probability: 10,
    'Close Date': '',
    Description: '',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createInteraction.mutateAsync(form as any);
    setShowCreate(false);
    setForm({ Type: 'note', Subject: '', Notes: '', Sentiment: 'neutral', Date: new Date().toISOString().split('T')[0], Participants: '' });
  }

  function openDealForm(interaction: Interaction) {
    setSelectedInteraction(interaction);
    setDealForm({
      Name: interaction.Subject || `${interaction.Type} - Deal`,
      Stage: 'Prospecting',
      Value: 0,
      Probability: 10,
      'Close Date': '',
      Description: interaction.Notes || `Created from ${interaction.Type}: ${interaction.Subject || ''}`,
    });
    setShowDealForm(true);
  }

  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInteraction) return;
    try {
      await createDeal.mutateAsync({
        interactionId: selectedInteraction.id,
        Name: dealForm.Name,
        Stage: dealForm.Stage,
        Value: dealForm.Value,
        Probability: dealForm.Probability,
        'Close Date': dealForm['Close Date'],
        Description: dealForm.Description,
        Contacts: selectedInteraction.Contact,
        Company: selectedInteraction.Company,
      });
      setShowDealForm(false);
      setSelectedInteraction(null);
    } catch {}
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interactions</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Interaction
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
            <option value="">All Types</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="note">Note</option>
          </Select>
        </div>
      </div>

      {!interactions || interactions.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No interactions yet"
          description="Start logging meetings, calls, emails, and notes."
          actionLabel="Log Interaction"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const Icon = typeIcons[interaction.Type] || MessageSquare;
            const colorClass = typeColors[interaction.Type] || 'bg-gray-100 text-gray-700';

            return (
              <div key={interaction.id} className="flex gap-4 rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{interaction.Subject || `${interaction.Type} interaction`}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{interaction.Type}</Badge>
                    <Badge className={`text-xs ${getSentimentColor(interaction.Sentiment)}`} variant="outline">
                      {interaction.Sentiment}
                    </Badge>
                  </div>
                  {interaction.Notes && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{interaction.Notes}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatDate(interaction.Date)}</span>
                    {interaction.Participants && <span>With: {interaction.Participants}</span>}
                    {interaction['Created By'] && <span>By: {interaction['Created By']}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0 self-start">
                  <button
                    onClick={() => openDealForm(interaction)}
                    className="rounded p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                    title="Convert to Deal"
                  >
                    <Target className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this interaction?')) deleteInteraction.mutate(interaction.id); }}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log interaction dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={form.Type} onChange={(e) => setForm({ ...form, Type: e.target.value })}>
                <option value="note">Note</option>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <Input type="date" value={form.Date} onChange={(e) => setForm({ ...form, Date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Subject</label>
            <Input value={form.Subject} onChange={(e) => setForm({ ...form, Subject: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Participants</label>
            <Input value={form.Participants} onChange={(e) => setForm({ ...form, Participants: e.target.value })} placeholder="Names separated by commas" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <Textarea value={form.Notes} onChange={(e) => setForm({ ...form, Notes: e.target.value })} rows={4} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sentiment</label>
            <Select value={form.Sentiment} onChange={(e) => setForm({ ...form, Sentiment: e.target.value })}>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createInteraction.isPending}>
              {createInteraction.isPending ? 'Saving...' : 'Log Interaction'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Convert to deal dialog */}
      <Dialog open={showDealForm} onClose={() => setShowDealForm(false)}>
        <DialogHeader><DialogTitle>Convert to Deal</DialogTitle></DialogHeader>
        {selectedInteraction && (
          <div className="mb-4 rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500">From interaction:</p>
            <p className="text-sm font-medium">{selectedInteraction.Subject || selectedInteraction.Type}</p>
            <p className="text-xs text-gray-500 mt-1">{formatDate(selectedInteraction.Date)}</p>
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
                {activeStages.map((s) => (
                  <option key={s.Name} value={s.Name}>{s.Name}</option>
                ))}
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
              {createDeal.isPending ? 'Creating Deal...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
