import { useState } from 'react';
import { usePipeline, useCreateDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useStages } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, GripVertical, Calendar, User } from 'lucide-react';
import { DEFAULT_STAGES } from '@/types';

export function PipelinePage() {
  const { data, isLoading } = usePipeline();
  const { data: stages } = useStages();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const [showCreate, setShowCreate] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);

  const activeStages = stages || DEFAULT_STAGES;
  const firstStage = activeStages[0]?.Name || 'Prospecting';

  const [form, setForm] = useState({
    Name: '', Stage: firstStage, Value: '', Probability: '', 'Close Date': '', Description: '', Owner: '',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDeal.mutateAsync({
      Name: form.Name,
      Stage: form.Stage,
      Value: Number(form.Value) || 0,
      Probability: Number(form.Probability) || 0,
      'Close Date': form['Close Date'],
      Description: form.Description,
      Owner: form.Owner,
    } as any);
    setShowCreate(false);
    setForm({ Name: '', Stage: firstStage, Value: '', Probability: '', 'Close Date': '', Description: '', Owner: '' });
  }

  function handleDragStart(dealId: string) {
    setDraggedDeal(dealId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(stage: string) {
    if (draggedDeal) {
      updateDeal.mutate({ id: draggedDeal, Stage: stage } as any);
      setDraggedDeal(null);
    }
  }

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { pipeline, summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-gray-500">
            {summary.dealCount} deals · {formatCurrency(summary.totalValue)} total · {formatCurrency(summary.weightedValue)} weighted
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Deal
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeStages.map((stage) => {
          const deals = pipeline[stage.Name] || [];
          const stageValue = deals.reduce((sum: number, d: any) => sum + (d.Value || 0), 0);

          return (
            <div
              key={stage.Name}
              className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-100"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.Name)}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.Color }} />
                  <span className="text-sm font-semibold">{stage.Name}</span>
                  <Badge variant="secondary" className="text-xs">{deals.length}</Badge>
                </div>
                <span className="text-xs text-gray-500">{formatCurrency(stageValue)}</span>
              </div>

              {/* Deal Cards */}
              <div className="flex-1 space-y-2 p-2 min-h-[200px]">
                {deals.map((deal: any) => (
                  <Card
                    key={deal.id}
                    className="cursor-grab bg-white p-3 active:cursor-grabbing hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={() => handleDragStart(deal.id)}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{deal.Name}</p>
                        <p className="text-lg font-bold text-primary mt-1">{formatCurrency(deal.Value || 0)}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          {deal['Close Date'] && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(deal['Close Date'])}
                            </span>
                          )}
                          {deal.Owner && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {deal.Owner}
                            </span>
                          )}
                        </div>
                        {deal.Probability > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Probability</span>
                              <span>{deal.Probability}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-100">
                              <div
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${Math.min(100, deal.Probability)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {deal.Tags && deal.Tags.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {deal.Tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Deal Name *</label>
            <Input value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Stage</label>
              <Select value={form.Stage} onChange={(e) => setForm({ ...form, Stage: e.target.value })}>
                {activeStages.map((stage) => (
                  <option key={stage.Name} value={stage.Name}>{stage.Name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Value ($)</label>
              <Input type="number" value={form.Value} onChange={(e) => setForm({ ...form, Value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Probability (%)</label>
              <Input type="number" min="0" max="100" value={form.Probability} onChange={(e) => setForm({ ...form, Probability: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Close Date</label>
              <Input type="date" value={form['Close Date']} onChange={(e) => setForm({ ...form, 'Close Date': e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Owner</label>
            <Input value={form.Owner} onChange={(e) => setForm({ ...form, Owner: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea value={form.Description} onChange={(e) => setForm({ ...form, Description: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createDeal.isPending}>
              {createDeal.isPending ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
