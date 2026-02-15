import { useParams, useNavigate } from 'react-router-dom';
import { useContact, useUpdateContact, useEnrichContact } from '@/hooks/useContacts';
import { useCreateInteraction } from '@/hooks/useInteractions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StrengthIndicator } from '@/components/common/StrengthIndicator';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { formatDate, formatRelativeDate, getSentimentColor } from '@/lib/utils';
import { useState } from 'react';
import {
  ArrowLeft, Mail, Phone, Linkedin, Building2, Calendar, MessageSquare,
  Sparkles, Users, FileText, PhoneCall, Target,
} from 'lucide-react';

const interactionIcons: Record<string, any> = {
  email: Mail, meeting: Users, call: PhoneCall, note: FileText,
};

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id);
  const updateContact = useUpdateContact();
  const enrichContact = useEnrichContact();
  const createInteraction = useCreateInteraction();
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    Type: 'note' as string, Subject: '', Notes: '', Sentiment: 'neutral' as string,
    Date: new Date().toISOString().split('T')[0],
  });

  if (isLoading) return <PageLoader />;
  if (!contact) return <div className="p-8 text-center">Contact not found</div>;

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    await createInteraction.mutateAsync({
      ...interactionForm,
      Contact: [id!],
      Date: interactionForm.Date,
    } as any);
    setShowInteractionForm(false);
    setInteractionForm({
      Type: 'note', Subject: '', Notes: '', Sentiment: 'neutral',
      Date: new Date().toISOString().split('T')[0],
    });
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/contacts')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Contacts
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {contact.Name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <h2 className="text-xl font-bold">{contact.Name}</h2>
              <p className="text-sm text-gray-500">{contact.Title}</p>
            </div>

            <div className="space-y-3">
              {contact.Email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${contact.Email}`} className="text-primary hover:underline">{contact.Email}</a>
                </div>
              )}
              {contact.Phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{contact.Phone}</span>
                </div>
              )}
              {contact.LinkedIn && (
                <div className="flex items-center gap-3 text-sm">
                  <Linkedin className="h-4 w-4 text-gray-400" />
                  <a href={contact.LinkedIn} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn Profile</a>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Last contact: {formatDate(contact['Last Interaction Date']) || 'Never'}</span>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Relationship Strength</p>
              <StrengthIndicator score={contact.calculatedStrength || contact['Relationship Strength'] || 0} />
            </div>

            {contact.Tags && contact.Tags.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {contact.Tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={() => setShowInteractionForm(true)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Log Interaction
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => enrichContact.mutate(id!)}
                disabled={enrichContact.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {enrichContact.isPending ? 'Enriching...' : 'Enrich Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detail Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="interactions">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="interactions">
              <Card>
                <CardContent className="p-6">
                  {(!contact.interactions || contact.interactions.length === 0) ? (
                    <p className="text-center text-sm text-gray-500 py-8">No interactions recorded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {contact.interactions.map((interaction: any) => {
                        const Icon = interactionIcons[interaction.Type] || MessageSquare;
                        return (
                          <div key={interaction.id} className="flex gap-4 rounded-lg border p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                              <Icon className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{interaction.Subject || interaction.Type}</span>
                                <Badge className={getSentimentColor(interaction.Sentiment)} variant="outline">
                                  {interaction.Sentiment}
                                </Badge>
                              </div>
                              {interaction.Notes && (
                                <p className="text-sm text-gray-600 mb-1">{interaction.Notes}</p>
                              )}
                              <p className="text-xs text-gray-400">{formatRelativeDate(interaction.Date)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deals">
              <Card>
                <CardContent className="p-6">
                  {(!contact.deals || contact.deals.length === 0) ? (
                    <p className="text-center text-sm text-gray-500 py-8">No deals associated</p>
                  ) : (
                    <div className="space-y-3">
                      {contact.deals.map((deal: any) => (
                        <div key={deal.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{deal.Name}</p>
                              <p className="text-xs text-gray-500">{deal.Stage}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(deal.Value || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{formatDate(deal['Close Date'])}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardContent className="p-6">
                  <Textarea
                    defaultValue={contact.Notes || ''}
                    placeholder="Add notes about this contact..."
                    rows={8}
                    onBlur={(e) => {
                      if (e.target.value !== (contact.Notes || '')) {
                        updateContact.mutate({ id: contact.id, Notes: e.target.value } as any);
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Log Interaction Dialog */}
      <Dialog open={showInteractionForm} onClose={() => setShowInteractionForm(false)}>
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogInteraction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={interactionForm.Type} onChange={(e) => setInteractionForm({ ...interactionForm, Type: e.target.value })}>
                <option value="note">Note</option>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <Input type="date" value={interactionForm.Date} onChange={(e) => setInteractionForm({ ...interactionForm, Date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Subject</label>
            <Input value={interactionForm.Subject} onChange={(e) => setInteractionForm({ ...interactionForm, Subject: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <Textarea value={interactionForm.Notes} onChange={(e) => setInteractionForm({ ...interactionForm, Notes: e.target.value })} rows={4} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sentiment</label>
            <Select value={interactionForm.Sentiment} onChange={(e) => setInteractionForm({ ...interactionForm, Sentiment: e.target.value })}>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowInteractionForm(false)}>Cancel</Button>
            <Button type="submit" disabled={createInteraction.isPending}>
              {createInteraction.isPending ? 'Saving...' : 'Log Interaction'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
