import { useState, useEffect } from 'react';
import { Shield, Search, Filter, Download, Clock } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { exportGenericCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

interface AuditEntry {
  id: string;
  type: 'access' | 'blockchain' | 'consent';
  user_id: string | null;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
  integrity_verified?: boolean;
}

export default function AuditLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    const [accessRes, blockchainRes, consentsRes] = await Promise.all([
      supabase.from('access_logs').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('blockchain_audit_trail').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('consents').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    const combined: AuditEntry[] = [
      ...(accessRes.data || []).map(a => ({
        id: a.id,
        type: 'access' as const,
        user_id: a.user_id,
        action: a.action,
        resource: `${a.resource_type}${a.resource_id ? `: ${a.resource_id.slice(0, 8)}...` : ''}`,
        details: `${a.action} on ${a.resource_type}`,
        timestamp: a.created_at,
      })),
      ...(blockchainRes.data || []).map(b => ({
        id: b.id,
        type: 'blockchain' as const,
        user_id: b.performed_by,
        action: b.action,
        resource: b.block_id ? `Block: ${b.block_id.slice(0, 8)}...` : 'System',
        details: b.verification_hash ? `Hash: ${b.verification_hash.slice(0, 16)}...` : b.action,
        timestamp: b.created_at,
        integrity_verified: b.integrity_verified,
      })),
      ...(consentsRes.data || []).map(c => ({
        id: c.id,
        type: 'consent' as const,
        user_id: null,
        action: c.status === 'revoked' ? 'CONSENT_REVOKED' : 'CONSENT_GRANTED',
        resource: `Patient: ${c.patient_id.slice(0, 8)}...`,
        details: `${c.access_type} access - ${c.status}`,
        timestamp: c.created_at,
      })),
    ];

    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEntries(combined);
    setLoading(false);
  };

  const filtered = entries.filter(e => {
    const matchesSearch = e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.resource.toLowerCase().includes(search.toLowerCase()) ||
      e.details.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || e.action.includes(actionFilter);
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesAction && matchesType;
  });

  // Timeline data
  const timelineData = (() => {
    const grouped: Record<string, { access: number; blockchain: number; consent: number }> = {};
    entries.forEach(e => {
      const date = new Date(e.timestamp).toLocaleDateString();
      if (!grouped[date]) grouped[date] = { access: 0, blockchain: 0, consent: 0 };
      grouped[date][e.type]++;
    });
    return Object.entries(grouped).map(([date, counts]) => ({ date, ...counts })).reverse();
  })();

  const handleExportCSV = () => {
    exportGenericCSV(filtered.map(e => ({
      type: e.type,
      action: e.action,
      resource: e.resource,
      details: e.details,
      timestamp: e.timestamp,
      user_id: e.user_id || '',
    })), 'audit_logs');
    toast({ title: 'CSV exported' });
  };

  const uniqueActions = [...new Set(entries.map(e => e.action))];

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Audit Logs</h1>
            <p className="text-muted-foreground">Comprehensive access and blockchain audit trail</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{entries.filter(e => e.type === 'access').length}</p>
              <p className="text-xs text-muted-foreground">Access Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{entries.filter(e => e.type === 'blockchain').length}</p>
              <p className="text-xs text-muted-foreground">Blockchain Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{entries.filter(e => e.type === 'consent').length}</p>
              <p className="text-xs text-muted-foreground">Consent Changes</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">Log Table</TabsTrigger>
            <TabsTrigger value="timeline">Timeline Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="blockchain">Blockchain</SelectItem>
                  <SelectItem value="consent">Consent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.slice(0, 15).map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 50).map(entry => (
                      <TableRow key={`${entry.type}-${entry.id}`}>
                        <TableCell>
                          <Badge variant="outline" className={
                            entry.type === 'access' ? 'border-primary text-primary' :
                            entry.type === 'blockchain' ? 'border-consensus text-consensus' :
                            'border-warning text-warning'
                          }>
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                        <TableCell className="text-sm">{entry.resource}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{entry.details}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>Audit events over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="access" stackId="1" stroke="hsl(195, 85%, 35%)" fill="hsl(195, 85%, 35%)" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="blockchain" stackId="1" stroke="hsl(142, 72%, 40%)" fill="hsl(142, 72%, 40%)" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="consent" stackId="1" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
