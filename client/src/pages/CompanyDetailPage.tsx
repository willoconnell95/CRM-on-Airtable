import { useParams, useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompanies';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StrengthIndicator } from '@/components/common/StrengthIndicator';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Globe, MapPin, Users, Target, Building2, MessageSquare } from 'lucide-react';

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useCompany(id);

  if (isLoading) return <PageLoader />;
  if (!company) return <div className="p-8 text-center">Company not found</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/companies')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Companies
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-purple-100 text-2xl font-bold text-purple-700">
                {company.Name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <h2 className="text-xl font-bold">{company.Name}</h2>
              {company.Stage && <Badge variant="secondary" className="mt-2">{company.Stage}</Badge>}
            </div>
            <div className="space-y-3">
              {company.Domain && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a href={`https://${company.Domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{company.Domain}</a>
                </div>
              )}
              {company.Industry && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>{company.Industry}</span>
                </div>
              )}
              {company.Location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{company.Location}</span>
                </div>
              )}
              {company.Size && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{company.Size} employees</span>
                </div>
              )}
            </div>
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Relationship Strength</p>
              <StrengthIndicator score={company.calculatedStrength || company['Relationship Strength'] || 0} />
            </div>
            {company.Description && (
              <div className="mt-4">
                <p className="mb-1 text-sm font-medium">About</p>
                <p className="text-sm text-gray-600">{company.Description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">Contacts ({company.contacts?.length || 0})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({company.deals?.length || 0})</TabsTrigger>
              <TabsTrigger value="interactions">Interactions ({company.interactions?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts">
              <Card>
                <CardContent className="p-6">
                  {(!company.contacts || company.contacts.length === 0) ? (
                    <p className="text-center text-sm text-gray-500 py-8">No contacts at this company</p>
                  ) : (
                    <div className="space-y-3">
                      {company.contacts.map((contact: any) => (
                        <button
                          key={contact.id}
                          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-gray-50"
                          onClick={() => navigate(`/contacts/${contact.id}`)}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {contact.Name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{contact.Name}</p>
                            <p className="text-xs text-gray-500">{contact.Title} {contact.Email ? `· ${contact.Email}` : ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deals">
              <Card>
                <CardContent className="p-6">
                  {(!company.deals || company.deals.length === 0) ? (
                    <p className="text-center text-sm text-gray-500 py-8">No deals</p>
                  ) : (
                    <div className="space-y-3">
                      {company.deals.map((deal: any) => (
                        <div key={deal.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{deal.Name}</p>
                              <Badge variant="secondary">{deal.Stage}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(deal.Value || 0)}</p>
                            <p className="text-xs text-gray-500">{formatDate(deal['Close Date'])}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interactions">
              <Card>
                <CardContent className="p-6">
                  {(!company.interactions || company.interactions.length === 0) ? (
                    <p className="text-center text-sm text-gray-500 py-8">No interactions</p>
                  ) : (
                    <div className="space-y-3">
                      {company.interactions.map((interaction: any) => (
                        <div key={interaction.id} className="flex gap-3 rounded-lg border p-4">
                          <MessageSquare className="h-5 w-5 text-gray-400 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{interaction.Subject || interaction.Type}</p>
                            {interaction.Notes && <p className="text-sm text-gray-600 mt-1">{interaction.Notes}</p>}
                            <p className="text-xs text-gray-400 mt-1">{formatDate(interaction.Date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
