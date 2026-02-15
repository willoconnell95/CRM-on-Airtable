import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies, useCreateCompany, useDeleteCompany } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StrengthIndicator } from '@/components/common/StrengthIndicator';
import { Plus, Search, Building2, Trash2 } from 'lucide-react';

export function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: companies, isLoading } = useCompanies(search ? { search } : undefined);
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    Name: '', Domain: '', Industry: '', Size: '', Location: '', Stage: 'Prospect', Description: '',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createCompany.mutateAsync(form as any);
    setShowCreate(false);
    setForm({ Name: '', Domain: '', Industry: '', Size: '', Location: '', Stage: 'Prospect', Description: '' });
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search companies..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {!companies || companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No companies yet"
          description="Add your first company to start managing business relationships."
          actionLabel="Add Company"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div
              key={company.id}
              className="cursor-pointer rounded-lg border bg-white p-5 transition-shadow hover:shadow-md"
              onClick={() => navigate(`/companies/${company.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-700">
                    {company.Name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{company.Name}</h3>
                    {company.Domain && <p className="text-xs text-gray-500">{company.Domain}</p>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteCompany.mutate(company.id); }}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {company.Industry && <p>Industry: {company.Industry}</p>}
                {company.Location && <p>Location: {company.Location}</p>}
                {company.Stage && <Badge variant="secondary">{company.Stage}</Badge>}
              </div>
              <div className="mt-3">
                <StrengthIndicator score={company['Relationship Strength'] || 0} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Domain</label>
            <Input value={form.Domain} onChange={(e) => setForm({ ...form, Domain: e.target.value })} placeholder="example.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Industry</label>
              <Select value={form.Industry} onChange={(e) => setForm({ ...form, Industry: e.target.value })}>
                <option value="">Select...</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Size</label>
              <Select value={form.Size} onChange={(e) => setForm({ ...form, Size: e.target.value })}>
                <option value="">Select...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-1000">201-1000</option>
                <option value="1001-5000">1001-5000</option>
                <option value="5000+">5000+</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <Input value={form.Location} onChange={(e) => setForm({ ...form, Location: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Stage</label>
              <Select value={form.Stage} onChange={(e) => setForm({ ...form, Stage: e.target.value })}>
                <option value="Prospect">Prospect</option>
                <option value="Active">Active</option>
                <option value="Customer">Customer</option>
                <option value="Partner">Partner</option>
                <option value="Churned">Churned</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea value={form.Description} onChange={(e) => setForm({ ...form, Description: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
