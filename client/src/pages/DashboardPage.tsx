import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/common/LoadingSpinner';
import { formatCurrency, formatRelativeDate, getStrengthColor, getStrengthLabel } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Building2, Target, TrendingUp, MessageSquare, Phone, Mail, FileText,
  AlertCircle,
} from 'lucide-react';

const COLORS = ['#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444'];

export function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const navigate = useNavigate();

  if (isLoading) return <PageLoader />;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load dashboard</div>;
  if (!data) return null;

  const { metrics, recentActivities, needsFollowUp, strengthDistribution, stageBreakdown } = data;

  const interactionChartData = Object.entries(metrics.interactionsByType).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count,
  }));

  const strengthChartData = [
    { name: 'Very Strong', value: strengthDistribution.veryStrong },
    { name: 'Strong', value: strengthDistribution.strong },
    { name: 'Moderate', value: strengthDistribution.moderate },
    { name: 'Weak', value: strengthDistribution.weak },
    { name: 'Very Weak', value: strengthDistribution.veryWeak },
  ].filter((d) => d.value > 0);

  const stageChartData = Object.entries(stageBreakdown).map(([stage, data]) => ({
    stage,
    count: (data as any).count,
    value: (data as any).value,
  }));

  const iconMap: Record<string, any> = {
    email: Mail, meeting: Users, call: Phone, note: FileText,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/contacts')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-3xl font-bold">{metrics.totalContacts}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/companies')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Companies</p>
                <p className="text-3xl font-bold">{metrics.totalCompanies}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/pipeline')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Deals</p>
                <p className="text-3xl font-bold">{metrics.activeDeals}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(metrics.totalPipelineValue)} pipeline</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Won Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(metrics.wonValue)}</p>
                <p className="text-xs text-muted-foreground">{metrics.wonDeals} deals closed</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
              ) : (
                recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.User}</span>{' '}
                        {activity.Details}
                      </p>
                      <p className="text-xs text-gray-500">{formatRelativeDate(activity.Timestamp)}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {activity['Entity Type']}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Needs Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Needs Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {needsFollowUp.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">All caught up!</p>
              ) : (
                needsFollowUp.map((contact: any) => (
                  <button
                    key={contact.id}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-gray-50"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                      {contact.Name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{contact.Name}</p>
                      <p className="text-xs text-gray-500">
                        Last: {contact['Last Interaction Date'] || 'Never'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interactions (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {interactionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={interactionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No interactions yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relationship Strength</CardTitle>
          </CardHeader>
          <CardContent>
            {strengthChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={strengthChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {strengthChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No contacts yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {stageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stageChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="stage" fontSize={11} width={80} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No deals yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
