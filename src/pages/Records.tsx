import { useState, useEffect } from 'react';
import { Database, Search, Filter, Download, Eye, Lock, Shield, Hash, Calendar, User, FileText, QrCode } from 'lucide-react';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import Layout from '@/components/Layout';
import { exportGenericCSV } from '@/lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BlockchainRecord, Patient, Vital } from '@/types';
import { cn } from '@/lib/utils';

interface RecordWithDetails extends BlockchainRecord {
  patient?: Patient;
  vital?: Vital;
}

export default function Records() {
  const [records, setRecords] = useState<RecordWithDetails[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<RecordWithDetails | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [blocksRes, patientsRes, vitalsRes] = await Promise.all([
      supabase.from('blockchain_records').select('*').order('block_number', { ascending: false }).limit(100),
      supabase.from('patients').select('*'),
      supabase.from('vitals').select('*'),
    ]);

    const patientsData = (patientsRes.data || []) as Patient[];
    const vitalsData = (vitalsRes.data || []) as Vital[];
    
    const recordsWithDetails = (blocksRes.data || []).map(block => ({
      ...block,
      patient: patientsData.find(p => p.id === block.patient_id),
      vital: vitalsData.find(v => v.id === block.vital_id),
    })) as RecordWithDetails[];

    setRecords(recordsWithDetails);
    setPatients(patientsData);
    setLoading(false);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.data_summary.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      record.current_hash.toLowerCase().includes(search.toLowerCase()) ||
      record.block_number.toString().includes(search);
    
    const matchesStatus = statusFilter === 'all' || record.data_summary.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatHash = (hash: string, length: number = 16) => {
    return `${hash.substring(0, length)}...${hash.substring(hash.length - 8)}`;
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Patient Records</h1>
            <p className="text-muted-foreground">Blockchain-secured medical records with full audit trail</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportGenericCSV(filteredRecords.map(r => ({
              block_number: r.block_number,
              patient: r.data_summary.patient_name,
              heart_rate: r.data_summary.heart_rate,
              temperature: r.data_summary.temperature,
              spo2: r.data_summary.spo2,
              status: r.data_summary.status,
              hash: r.current_hash,
              consensus: r.consensus_status,
              timestamp: r.created_at,
            })), 'blockchain_records')}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{records.length}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-consensus/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-consensus" />
              </div>
              <div>
                <p className="text-2xl font-bold">{records.filter(r => r.consensus_status === 'validated').length}</p>
                <p className="text-xs text-muted-foreground">Validated</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-alert/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-alert" />
              </div>
              <div>
                <p className="text-2xl font-bold">{records.filter(r => r.data_summary.status === 'ALERT').length}</p>
                <p className="text-xs text-muted-foreground">Alert Records</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-block/10 flex items-center justify-center">
                <User className="h-5 w-5 text-block" />
              </div>
              <div>
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-xs text-muted-foreground">Patients</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name, hash, or block number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="ALERT">Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Blockchain Records
            </CardTitle>
            <CardDescription>
              Each record is immutably stored with cryptographic verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Vitals Summary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Consensus</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.slice(0, 20).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono font-bold">#{record.block_number}</TableCell>
                    <TableCell>{record.data_summary.patient_name}</TableCell>
                    <TableCell className="text-xs">
                      <span>HR: {record.data_summary.heart_rate}</span>
                      <span className="mx-1">|</span>
                      <span>T: {record.data_summary.temperature}°C</span>
                      <span className="mx-1">|</span>
                      <span>SpO₂: {record.data_summary.spo2}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={record.data_summary.status === 'ALERT' ? 'bg-alert' : 'bg-success'}>
                        {record.data_summary.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {formatHash(record.current_hash, 12)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        record.consensus_status === 'validated' 
                          ? 'border-consensus text-consensus' 
                          : 'border-warning text-warning'
                      }>
                        {record.consensus_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <QRCodeGenerator
                          patientId={record.patient_id}
                          patientName={record.data_summary.patient_name || 'Patient'}
                          blockHash={record.current_hash}
                          tamperStatus={record.consensus_status === 'validated' ? 'verified' : 'unknown'}
                        />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Hash className="h-5 w-5" />
                              Block #{record.block_number} Details
                            </DialogTitle>
                          </DialogHeader>
                          <Tabs defaultValue="data" className="mt-4">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="data">Patient Data</TabsTrigger>
                              <TabsTrigger value="crypto">Cryptographic</TabsTrigger>
                              <TabsTrigger value="consensus">Consensus</TabsTrigger>
                            </TabsList>
                            <TabsContent value="data" className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">Patient Name</p>
                                  <p className="font-medium">{record.data_summary.patient_name}</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  <Badge className={record.data_summary.status === 'ALERT' ? 'bg-alert' : 'bg-success'}>
                                    {record.data_summary.status}
                                  </Badge>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">Heart Rate</p>
                                  <p className="font-medium">{record.data_summary.heart_rate} bpm</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">Temperature</p>
                                  <p className="font-medium">{record.data_summary.temperature}°C</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">SpO₂</p>
                                  <p className="font-medium">{record.data_summary.spo2}%</p>
                                </div>
                                {record.data_summary.blood_pressure && (
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Blood Pressure</p>
                                    <p className="font-medium">{record.data_summary.blood_pressure} mmHg</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                            <TabsContent value="crypto" className="space-y-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Current Hash (SHA-256)</p>
                                  <code className="text-xs bg-primary/10 p-3 rounded block font-mono break-all text-primary">
                                    {record.current_hash}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Previous Hash (Chain Link)</p>
                                  <code className="text-xs bg-muted p-3 rounded block font-mono break-all text-hash">
                                    {record.previous_hash}
                                  </code>
                                </div>
                                {record.data_summary.merkle_root && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Merkle Root</p>
                                    <code className="text-xs bg-muted p-3 rounded block font-mono break-all">
                                      {record.data_summary.merkle_root}
                                    </code>
                                  </div>
                                )}
                                {record.data_summary.nonce && (
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Nonce</p>
                                    <p className="font-mono font-medium">{record.data_summary.nonce}</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                            <TabsContent value="consensus" className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  <Badge className={record.consensus_status === 'validated' ? 'bg-consensus' : 'bg-warning'}>
                                    {record.consensus_status}
                                  </Badge>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-xs text-muted-foreground">Validation Time</p>
                                  <p className="font-medium">{record.validation_time_ms}ms</p>
                                </div>
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground mb-2">Validated By</p>
                                <div className="flex flex-wrap gap-2">
                                  {record.validated_by?.map((node) => (
                                    <Badge key={node} variant="secondary">{node}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="p-4 bg-consensus/10 border border-consensus/30 rounded-lg">
                                <p className="text-sm text-consensus font-medium">
                                  ✓ This record is immutably secured on the blockchain
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Any modification would invalidate the hash chain
                                </p>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </DialogContent>
                      </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
