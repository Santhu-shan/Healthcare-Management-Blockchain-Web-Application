import { useState, useEffect } from 'react';
import { Shield, Users, Stethoscope, CheckCircle, XCircle, Calendar, Boxes, FileText, CreditCard, Wallet, UserCheck, UserX } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sendEthPayment, usdToEth, getAdminWallet, setAdminWallet } from '@/lib/ethPayments';
import { connectMetaMask, isMetaMaskInstalled } from '@/lib/ethereum';

export default function AdminPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [blockchainRecords, setBlockchainRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminWallet, setAdminWalletState] = useState(getAdminWallet());
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [billForm, setBillForm] = useState({ patient_id: '', description: '', amount_usd: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [pendingRes, doctorsRes, patientsRes, apptsRes, billsRes, blocksRes] = await Promise.all([
      supabase.from('user_roles').select('*').eq('role', 'pending'),
      supabase.from('doctors').select('*').order('created_at', { ascending: false }),
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').order('created_at', { ascending: false }),
      supabase.from('bills').select('*').order('created_at', { ascending: false }),
      supabase.from('blockchain_records').select('*').order('block_number', { ascending: false }).limit(20),
    ]);
    setPendingUsers(pendingRes.data || []);
    setDoctors(doctorsRes.data || []);
    setPatients(patientsRes.data || []);
    setAppointments(apptsRes.data || []);
    setBills(billsRes.data || []);
    setBlockchainRecords(blocksRes.data || []);
    setLoading(false);
  };

  const handleApproveUser = async (userId: string, newRole: 'doctor' | 'admin') => {
    const { error } = await supabase.from('user_roles').update({ role: newRole } as any).eq('user_id', userId);
    if (!error) {
      toast({ title: 'User Approved', description: `Role set to ${newRole}` });
      setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
    }
  };

  const handleRejectUser = async (userId: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    toast({ title: 'User Rejected' });
    setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleApproveAppointment = async (apptId: string, doctorId: string) => {
    await supabase.from('appointments').update({ status: 'approved', doctor_id: doctorId } as any).eq('id', apptId);
    toast({ title: 'Appointment Approved' });
    loadData();
  };

  const handleRejectAppointment = async (apptId: string) => {
    await supabase.from('appointments').update({ status: 'rejected' } as any).eq('id', apptId);
    toast({ title: 'Appointment Rejected' });
    loadData();
  };

  const handleAssignDoctor = async (patientId: string, doctorId: string) => {
    // Check if assignment exists
    const { data: existing } = await supabase.from('patient_doctor_assignments').select('id').eq('patient_id', patientId).eq('doctor_id', doctorId);
    if (existing && existing.length > 0) {
      toast({ title: 'Already assigned' });
      return;
    }
    await supabase.from('patient_doctor_assignments').insert({ patient_id: patientId, doctor_id: doctorId, is_primary: true });
    await supabase.from('patients').update({ assigned_doctor_id: doctorId }).eq('id', patientId);
    toast({ title: 'Doctor Assigned' });
  };

  const handleCreateBill = async () => {
    if (!billForm.patient_id || !billForm.description || !billForm.amount_usd) return;
    const { error } = await supabase.from('bills').insert({
      patient_id: billForm.patient_id,
      description: billForm.description,
      amount_usd: parseFloat(billForm.amount_usd),
      status: 'pending',
    } as any);
    if (!error) {
      toast({ title: 'Bill Created' });
      setCreateBillOpen(false);
      setBillForm({ patient_id: '', description: '', amount_usd: '' });
      loadData();
    }
  };

  const handlePayForBlock = async () => {
    if (!isMetaMaskInstalled()) {
      toast({ title: 'MetaMask Required', variant: 'destructive' });
      return;
    }
    try {
      await connectMetaMask();
      // Admin pays a small fee for block creation
      const result = await sendEthPayment('0x0000000000000000000000000000000000000001', '0.0001');
      if (result.success) {
        toast({ title: 'Block Fee Paid', description: `TX: ${result.txHash?.slice(0, 16)}...` });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveAdminWallet = () => {
    setAdminWallet(adminWallet);
    toast({ title: 'Admin Wallet Saved', description: 'Patients will pay to this address.' });
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  const pendingAppointments = appointments.filter(a => a.status === 'pending');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2"><Shield className="h-8 w-8 text-primary" /> Admin Portal</h1>
          <p className="text-muted-foreground">Manage users, appointments, billing, and blockchain operations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{pendingUsers.length}</p><p className="text-xs text-muted-foreground">Pending Approvals</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{doctors.length}</p><p className="text-xs text-muted-foreground">Doctors</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{patients.length}</p><p className="text-xs text-muted-foreground">Patients</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{pendingAppointments.length}</p><p className="text-xs text-muted-foreground">Pending Appts</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{blockchainRecords.length}</p><p className="text-xs text-muted-foreground">Blocks Created</p></CardContent></Card>
        </div>

        <Tabs defaultValue="approvals" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="approvals">User Approvals</TabsTrigger>
            <TabsTrigger value="doctors">Doctor Management</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* User Approvals */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Pending User Approvals</CardTitle></CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? <p className="text-center py-8 text-muted-foreground">No pending approvals</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>User ID</TableHead><TableHead>Current Role</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {pendingUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">{u.user_id.slice(0, 12)}...</TableCell>
                          <TableCell><Badge className="bg-warning">{u.role}</Badge></TableCell>
                          <TableCell className="flex gap-2">
                            <Button size="sm" onClick={() => handleApproveUser(u.user_id, 'doctor')} className="gap-1"><CheckCircle className="h-3 w-3" /> Approve as Doctor</Button>
                            <Button size="sm" variant="outline" onClick={() => handleApproveUser(u.user_id, 'admin')} className="gap-1"><Shield className="h-3 w-3" /> Make Admin</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectUser(u.user_id)} className="gap-1"><XCircle className="h-3 w-3" /> Reject</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Doctor Management */}
          <TabsContent value="doctors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Doctor Management</CardTitle>
                <CardDescription>Assign doctors to patients</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Specialization</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Assign to Patient</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {doctors.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{doc.specialization}</TableCell>
                        <TableCell>{doc.department}</TableCell>
                        <TableCell><Badge className={doc.is_active ? 'bg-success' : 'bg-muted'}>{doc.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>
                          <Select onValueChange={(pid) => handleAssignDoctor(pid, doc.id)}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select patient" /></SelectTrigger>
                            <SelectContent>
                              {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Appointment Management</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Assign Doctor & Approve</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {appointments.map(appt => {
                      const pat = patients.find(p => p.id === appt.patient_id);
                      return (
                        <TableRow key={appt.id}>
                          <TableCell className="font-medium">{pat?.name || 'Unknown'}</TableCell>
                          <TableCell>{new Date(appt.appointment_date).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{appt.reason}</TableCell>
                          <TableCell>
                            <Badge className={
                              appt.status === 'approved' ? 'bg-success' :
                              appt.status === 'rejected' ? 'bg-destructive' :
                              appt.status === 'completed' ? 'bg-primary' : 'bg-warning'
                            }>{appt.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {appt.status === 'pending' && (
                              <div className="flex gap-2 items-center">
                                <Select onValueChange={(docId) => handleApproveAppointment(appt.id, docId)}>
                                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assign & Approve" /></SelectTrigger>
                                  <SelectContent>
                                    {doctors.filter(d => d.is_active).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectAppointment(appt.id)}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={createBillOpen} onOpenChange={setCreateBillOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><CreditCard className="h-4 w-4" /> Create Bill</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create New Bill</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Patient</Label>
                        <Select onValueChange={v => setBillForm(p => ({ ...p, patient_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                          <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="e.g., Consultation fee" value={billForm.description} onChange={e => setBillForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (USD)</Label>
                        <Input type="number" placeholder="50.00" value={billForm.amount_usd} onChange={e => setBillForm(p => ({ ...p, amount_usd: e.target.value }))} />
                        {billForm.amount_usd && <p className="text-xs text-muted-foreground">≈ {usdToEth(parseFloat(billForm.amount_usd))} ETH</p>}
                      </div>
                      <Button onClick={handleCreateBill} className="w-full">Create Bill</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card>
                <CardHeader><CardTitle>All Bills</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Patient</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>TX Hash</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {bills.map(bill => {
                        const pat = patients.find(p => p.id === bill.patient_id);
                        return (
                          <TableRow key={bill.id}>
                            <TableCell>{pat?.name || 'Unknown'}</TableCell>
                            <TableCell>{bill.description}</TableCell>
                            <TableCell>${Number(bill.amount_usd).toFixed(2)}</TableCell>
                            <TableCell><Badge className={bill.status === 'paid' ? 'bg-success' : 'bg-warning'}>{bill.status}</Badge></TableCell>
                            <TableCell>
                              {bill.tx_hash ? (
                                <a href={`https://sepolia.etherscan.io/tx/${bill.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-mono">{bill.tx_hash.slice(0, 12)}...</a>
                              ) : '--'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Blockchain */}
          <TabsContent value="blockchain">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handlePayForBlock} className="gap-2"><Wallet className="h-4 w-4" /> Pay Block Creation Fee (0.0001 ETH)</Button>
              </div>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" /> Recent Blocks</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>#</TableHead><TableHead>Hash</TableHead><TableHead>Previous</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {blockchainRecords.map(block => (
                        <TableRow key={block.id}>
                          <TableCell className="font-bold">{block.block_number}</TableCell>
                          <TableCell className="font-mono text-xs">{block.current_hash?.slice(0, 16)}...</TableCell>
                          <TableCell className="font-mono text-xs">{block.previous_hash?.slice(0, 16)}...</TableCell>
                          <TableCell><Badge className={block.consensus_status === 'validated' ? 'bg-success' : 'bg-warning'}>{block.consensus_status}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(block.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Admin Wallet Configuration</CardTitle>
                <CardDescription>Set the wallet address that receives patient payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Admin Wallet Address (Sepolia)</Label>
                  <Input placeholder="0x..." value={adminWallet} onChange={e => setAdminWalletState(e.target.value)} className="font-mono" />
                </div>
                <Button onClick={handleSaveAdminWallet}>Save Wallet Address</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
