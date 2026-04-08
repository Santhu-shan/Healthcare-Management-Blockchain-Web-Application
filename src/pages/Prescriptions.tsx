import { useState, useEffect } from 'react';
import { Pill, Search, Download } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Prescription } from '@/types';
import { ShieldCheck, Shield, ExternalLink } from 'lucide-react';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<(Prescription & { patient_name?: string; doctor_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    const { data } = await supabase
      .from('prescriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (data && data.length > 0) {
      // Fetch patient and doctor names
      const patientIds = [...new Set(data.map(p => p.patient_id))];
      const doctorIds = [...new Set(data.map(p => p.doctor_id))];

      const [patientsRes, doctorsRes] = await Promise.all([
        supabase.from('patients').select('id, name').in('id', patientIds),
        supabase.from('doctors').select('id, name').in('id', doctorIds),
      ]);

      const patientMap = new Map((patientsRes.data || []).map(p => [p.id, p.name]));
      const doctorMap = new Map((doctorsRes.data || []).map(d => [d.id, d.name]));

      setPrescriptions(data.map(rx => ({
        ...(rx as Prescription),
        patient_name: patientMap.get(rx.patient_id) || 'Unknown',
        doctor_name: doctorMap.get(rx.doctor_id) || 'Unknown',
      })));
    } else {
      setPrescriptions([]);
    }
    setLoading(false);
  };

  const filtered = prescriptions.filter(rx => {
    const matchesSearch = !search ||
      rx.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      rx.patient_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Medicine', 'Dosage', 'Frequency', 'Patient', 'Doctor', 'Start', 'End', 'Status', 'Blockchain Hash'];
    const rows = filtered.map(rx => [
      rx.medicine_name, rx.dosage, rx.frequency, rx.patient_name, rx.doctor_name,
      rx.start_date, rx.end_date || '', rx.status, rx.blockchain_hash || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescriptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const frequencyLabel = (f: string) => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Pill className="h-6 w-6" />
              Prescriptions
            </h1>
            <p className="text-muted-foreground">{filtered.length} prescription(s)</p>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by medicine or patient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Blockchain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No prescriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(rx => (
                    <TableRow key={rx.id}>
                      <TableCell className="font-medium">{rx.medicine_name}</TableCell>
                      <TableCell>{rx.dosage}</TableCell>
                      <TableCell className="text-sm">{frequencyLabel(rx.frequency)}</TableCell>
                      <TableCell>{rx.patient_name}</TableCell>
                      <TableCell>{rx.doctor_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(rx.start_date).toLocaleDateString()}
                        {rx.end_date ? ` → ${new Date(rx.end_date).toLocaleDateString()}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          rx.status === 'active' ? 'bg-success' :
                          rx.status === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-alert'
                        }>
                          {rx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rx.blockchain_hash ? (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${rx.blockchain_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-xs font-mono"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {rx.blockchain_hash.slice(0, 8)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Shield className="h-3 w-3" />
                            Off-chain
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
