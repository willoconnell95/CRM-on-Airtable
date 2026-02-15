import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts, useCreateContact, useDeleteContact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { StrengthIndicator } from '@/components/common/StrengthIndicator';
import { formatDate, truncate } from '@/lib/utils';
import { Plus, Search, Users, Trash2, ExternalLink } from 'lucide-react';

export function ContactsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: contacts, isLoading } = useContacts(search ? { search } : undefined);
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    Name: '', Email: '', Phone: '', Title: '', LinkedIn: '', Tags: [] as string[], Notes: '',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createContact.mutateAsync(form);
    setShowCreate(false);
    setForm({ Name: '', Email: '', Phone: '', Title: '', LinkedIn: '', Tags: [], Notes: '' });
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!contacts || contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No contacts yet"
          description="Add your first contact to get started tracking relationships."
          actionLabel="Add Contact"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tags</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Strength</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Contact</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {contact.Name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-sm">{contact.Name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{truncate(contact.Title, 30)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.Email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(contact.Tags || []).slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      {(contact.Tags || []).length > 2 && (
                        <Badge variant="secondary" className="text-xs">+{contact.Tags.length - 2}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 w-48">
                    <StrengthIndicator score={contact['Relationship Strength'] || 0} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(contact['Last Interaction Date'])}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this contact?')) deleteContact.mutate(contact.id);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input value={form.Name} onChange={(e) => setForm({ ...form, Name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <Input value={form.Phone} onChange={(e) => setForm({ ...form, Phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input value={form.Title} onChange={(e) => setForm({ ...form, Title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">LinkedIn URL</label>
            <Input value={form.LinkedIn} onChange={(e) => setForm({ ...form, LinkedIn: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <Textarea value={form.Notes} onChange={(e) => setForm({ ...form, Notes: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending ? 'Creating...' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
