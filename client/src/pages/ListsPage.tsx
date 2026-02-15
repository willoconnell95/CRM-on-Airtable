import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, List, Trash2, Download, Filter } from 'lucide-react';
import type { List as ListType } from '@/types';

export function ListsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: lists, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get<{ records: ListType[] }>('/lists'),
    select: (data) => data.records,
  });

  const { data: listDetail } = useQuery({
    queryKey: ['lists', selectedList],
    queryFn: () => api.get<ListType & { matchedRecords: any[] }>(`/lists/${selectedList}`),
    enabled: !!selectedList,
  });

  const createList = useMutation({
    mutationFn: (data: any) => api.post('/lists', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setSelectedList(null);
    },
  });

  const exportList = useMutation({
    mutationFn: async (id: string) => {
      const csv = await api.post<string>(`/lists/${id}/export`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const [form, setForm] = useState({
    Name: '',
    Type: 'contacts' as string,
    filters: [{ field: '', operator: 'contains', value: '' }],
  });

  function addFilter() {
    setForm({ ...form, filters: [...form.filters, { field: '', operator: 'contains', value: '' }] });
  }

  function removeFilter(index: number) {
    setForm({ ...form, filters: form.filters.filter((_, i) => i !== index) });
  }

  function updateFilter(index: number, key: string, value: string) {
    const updated = [...form.filters];
    (updated[index] as any)[key] = value;
    setForm({ ...form, filters: updated });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const validFilters = form.filters.filter((f) => f.field && f.value);
    await createList.mutateAsync({
      Name: form.Name,
      Type: form.Type,
      Filters: JSON.stringify(validFilters),
    });
    setShowCreate(false);
    setForm({ Name: '', Type: 'contacts', filters: [{ field: '', operator: 'contains', value: '' }] });
  }

  if (isLoading) return <PageLoader />;

  const contactFields = ['Name', 'Email', 'Title', 'Owner', 'Tags', 'Relationship Strength'];
  const companyFields = ['Name', 'Domain', 'Industry', 'Location', 'Stage', 'Relationship Strength'];
  const currentFields = form.Type === 'companies' ? companyFields : contactFields;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lists</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create List
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lists sidebar */}
        <div className="space-y-3">
          {!lists || lists.length === 0 ? (
            <EmptyState
              icon={<List className="h-12 w-12" />}
              title="No lists yet"
              description="Create smart lists to segment your contacts and companies."
              actionLabel="Create List"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  selectedList === list.id ? 'border-primary bg-primary/5' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => setSelectedList(list.id)}
              >
                <div className="flex items-center gap-3">
                  <List className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{list.Name}</p>
                    <Badge variant="secondary" className="text-xs capitalize">{list.Type}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); exportList.mutate(list.id); }}
                    className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                    title="Export CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteList.mutate(list.id); }}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* List Results */}
        <div className="lg:col-span-2">
          {selectedList && listDetail ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{listDetail.Name}</CardTitle>
                  <Badge variant="secondary">{listDetail.matchedRecords?.length || 0} results</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {(!listDetail.matchedRecords || listDetail.matchedRecords.length === 0) ? (
                  <p className="text-center text-sm text-gray-500 py-8">No matching records</p>
                ) : (
                  <div className="space-y-2">
                    {listDetail.matchedRecords.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between rounded border p-3">
                        <div>
                          <p className="font-medium text-sm">{record.Name}</p>
                          <p className="text-xs text-gray-500">
                            {record.Email || record.Domain || record.Industry || ''}
                          </p>
                        </div>
                        {record['Relationship Strength'] !== undefined && (
                          <span className="text-sm font-medium">{record['Relationship Strength']}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">
              <p>Select a list to view results</p>
            </div>
          )}
        </div>
      </div>

      {/* Create List Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} className="max-w-xl">
        <DialogHeader><DialogTitle>Create Smart List</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">List Name *</label>
              <Input value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={form.Type} onChange={(e) => setForm({ ...form, Type: e.target.value })}>
                <option value="contacts">Contacts</option>
                <option value="companies">Companies</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Filter className="h-4 w-4" /> Filters
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={addFilter}>
                <Plus className="mr-1 h-3 w-3" /> Add Filter
              </Button>
            </div>
            <div className="space-y-2">
              {form.filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, 'field', e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Select field...</option>
                    {currentFields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                  <Select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                    className="w-32"
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                  </Select>
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    className="flex-1"
                    placeholder="Value"
                  />
                  {form.filters.length > 1 && (
                    <button type="button" onClick={() => removeFilter(index)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createList.isPending}>
              {createList.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
