import { useState, useEffect } from 'react';
import { Heart, Activity, Shield, Download, FileText, QrCode, Bell, Clock, Pill, Wallet, CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import Layout from '@/components/Layout';
import VitalsChart from '@/components/VitalsChart';
import PatientBlockchainHistory from '@/components/PatientBlockchainHistory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Patient, Vital, AlertLog } from '@/types';
import { generateHealthReportPDF, exportVitalsCSV } from '@/lib/exportUtils';
import { PrescriptionList } from '@/components/PrescriptionList';
import { sendEthPayment, usdToEth, getAdminWallet } from '@/lib/ethPayments';
import { connectMetaMask, isMetaMaskInstalled } from '@/lib/ethereum';

export default function PatientPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState({ date: '', reason: '' });
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (user) loadPatientData();
  }, [user]);

  const loadPatientData = async () => {
    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (!patientData) { setLoading(false); return; }
    setPatient(patientData as Patient);

    const [vitalsRes, alertsRes, billsRes, apptRes] = await Promise.all([
      supabase.from('vitals').select('*').eq('patient_id', patientData.id).order('recorded_at', { ascending: true }).limit(100),
      supabase.from('alert_logs').select('*').eq('patient_id', patientData.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('bills').select('*').eq('patient_id', patientData.id).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('patient_id', patientData.id).order('appointment_date', { ascending: false }),
    ]);

    setVitals((vitalsRes.data || []) as Vital[]);
    setAlerts((alertsRes.data || []) as AlertLog[]);
    setBills(billsRes.data || []);
    setAppointments(apptRes.data || []);
    setLoading(false);
  };

  const handlePayBill = async (bill: any) => {
    if (!isMetaMaskInstalled()) {
      toast({ title: 'MetaMask Required', description: 'Install MetaMask to make payments.', variant: 'destructive' });
      return;
    }
    const adminWallet = getAdminWallet();
    if (!adminWallet) {
      toast({ title: 'Admin Wallet Not Set', description: 'The system admin wallet address is not configured.', variant: 'destructive' });
      return;
    }

    setPayingBillId(bill.id);
    try {
      await connectMetaMask();
      const ethAmount = usdToEth(Number(bill.amount_usd));
      toast({ title: 'Confirm in MetaMask', description: `Paying $${bill.amount_usd} (${ethAmount} ETH)` });

      const result = await sendEthPayment(adminWallet, ethAmount);
      if (result.success) {
        await supabase.from('bills').update({
          status: 'paid',
          tx_hash: result.txHash,
          eth_amount: ethAmount,
          paid_at: new Date().toISOString(),
        } as any).eq('id', bill.id);

        setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'paid', tx_hash: result.txHash, eth_amount: ethAmount } : b));
        toast({ title: 'Payment Successful!', description: `TX: ${result.txHash?.slice(0, 12)}...` });
      } else {
        toast({ title: 'Payment Failed', description: result.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPayingBillId(null);
    }
  };

  const handleBookAppointment = async () => {
    if (!patient || !bookingData.date || !bookingData.reason) return;
    setBookingLoading(true);

    // Create a blockchain transaction for appointment booking
    let txHash: string | undefined;
    if (isMetaMaskInstalled()) {
      try {
        await connectMetaMask();
        const adminWallet = getAdminWallet();
        if (adminWallet) {
          const result = await sendEthPayment(adminWallet, '0.0001'); // Small fee for appointment
          txHash = result.txHash;
        }
      } catch {}
    }

    const { error } = await supabase.from('appointments').insert({
      patient_id: patient.id,
      appointment_date: new Date(bookingData.date).toISOString(),
      reason: bookingData.reason,
      status: 'pending',
      tx_hash: txHash || null,
    } as any);

    if (!error) {
      toast({ title: 'Appointment Requested', description: 'Waiting for admin approval.' });
      setBookingOpen(false);
      setBookingData({ date: '', reason: '' });
      loadPatientData();
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setBookingLoading(false);
  };

  const handleDownloadReport = async () => {
    if (!patient) return;
    const { data: txData } = await supabase.from('blockchain_transactions').select('tx_hash').eq('patient_id', patient.id);
    const txHashes = (txData || []).map(t => t.tx_hash);
    await generateHealthReportPDF(patient.name, { age: patient.age, gender: patient.gender, room: patient.room_number, diagnosis: patient.diagnosis, admitted: patient.admission_date }, vitals, txHashes.length > 0, txHashes);
    toast({ title: 'Report downloaded' });
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  if (!patient) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Heart className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Patient Profile Found</h2>
          <p className="text-muted-foreground text-center max-w-md">Your account is not yet linked to a patient record. Please contact your healthcare provider.</p>
        </div>
      </Layout>
    );
  }

  const latestVital = vitals[vitals.length - 1];
  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const pendingBills = bills.filter(b => b.status === 'pending');
  const paidBills = bills.filter(b => b.status === 'paid');
  const pendingAppointments = appointments.filter(a => a.status === 'pending');

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">My Health Portal</h1>
            <p className="text-muted-foreground">Welcome, {patient.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Calendar className="h-4 w-4" /> Book Appointment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Book an Appointment</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Preferred Date & Time</Label>
                    <Input type="datetime-local" value={bookingData.date} onChange={e => setBookingData(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea placeholder="Describe your symptoms or reason..." value={bookingData.reason} onChange={e => setBookingData(p => ({ ...p, reason: e.target.value }))} />
                  </div>
                  <p className="text-xs text-muted-foreground">A small booking fee (0.0001 ETH) will be charged via MetaMask.</p>
                  <Button onClick={handleBookAppointment} disabled={bookingLoading} className="w-full">
                    {bookingLoading ? 'Booking...' : 'Submit & Pay Booking Fee'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleDownloadReport} className="gap-2">
              <Download className="h-4 w-4" /> Health Report
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Heart className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{latestVital?.heart_rate ?? '--'}</p><p className="text-xs text-muted-foreground">Heart Rate</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Activity className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold">{latestVital?.temperature ?? '--'}°C</p><p className="text-xs text-muted-foreground">Temperature</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Activity className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{latestVital?.spo2 ?? '--'}%</p><p className="text-xs text-muted-foreground">SpO₂</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{pendingBills.length}</p><p className="text-xs text-muted-foreground">Pending Bills</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center"><Clock className="h-5 w-5 text-accent-foreground" /></div>
            <div><p className="text-2xl font-bold">{pendingAppointments.length}</p><p className="text-xs text-muted-foreground">Pending Appts</p></div>
          </CardContent></Card>
        </div>

        {/* Blood Pressure & Respiratory */}
        {latestVital && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Blood Pressure</p>
              <p className="text-xl font-bold">{latestVital.blood_pressure_systolic ?? '--'}/{latestVital.blood_pressure_diastolic ?? '--'} <span className="text-xs font-normal text-muted-foreground">mmHg</span></p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Respiratory Rate</p>
              <p className="text-xl font-bold">{latestVital.respiratory_rate ?? '--'} <span className="text-xs font-normal text-muted-foreground">breaths/min</span></p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={latestVital.status === 'NORMAL' ? 'bg-success' : 'bg-destructive'}>{latestVital.status}</Badge>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Last Recorded</p>
              <p className="text-sm font-medium">{new Date(latestVital.recorded_at).toLocaleString()}</p>
            </CardContent></Card>
          </div>
        )}

        <Tabs defaultValue="vitals" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="vitals">Vital Trends</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="vitals">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <VitalsChart vitals={vitals} type="heart_rate" title="Heart Rate" />
              <VitalsChart vitals={vitals} type="temperature" title="Body Temperature" />
              <VitalsChart vitals={vitals} type="spo2" title="Oxygen Saturation" />
            </div>
          </TabsContent>

          <TabsContent value="prescriptions">
            <PrescriptionList patientId={patient.id} />
          </TabsContent>

          <TabsContent value="bills">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Bills */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><CreditCard className="h-5 w-5" /> Pending Bills</CardTitle></CardHeader>
                <CardContent>
                  {pendingBills.length === 0 ? <p className="text-center py-8 text-muted-foreground">No pending bills 🎉</p> : (
                    <div className="space-y-3">
                      {pendingBills.map(bill => (
                        <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">{bill.description}</p>
                            <p className="text-sm text-muted-foreground">${Number(bill.amount_usd).toFixed(2)} ≈ {usdToEth(Number(bill.amount_usd))} ETH</p>
                          </div>
                          <Button size="sm" onClick={() => handlePayBill(bill)} disabled={payingBillId === bill.id} className="gap-2">
                            <Wallet className="h-4 w-4" />
                            {payingBillId === bill.id ? 'Paying...' : 'Pay with ETH'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paid Bills */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" /> Paid Bills</CardTitle></CardHeader>
                <CardContent>
                  {paidBills.length === 0 ? <p className="text-center py-8 text-muted-foreground">No paid bills yet</p> : (
                    <div className="space-y-3">
                      {paidBills.map(bill => (
                        <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div>
                            <p className="font-medium">{bill.description}</p>
                            <p className="text-sm text-muted-foreground">${Number(bill.amount_usd).toFixed(2)} • {bill.eth_amount} ETH</p>
                            {bill.tx_hash && (
                              <a href={`https://sepolia.etherscan.io/tx/${bill.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-mono">
                                {bill.tx_hash.slice(0, 16)}...
                              </a>
                            )}
                          </div>
                          <Badge className="bg-success">Paid</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> My Appointments</CardTitle></CardHeader>
              <CardContent>
                {appointments.length === 0 ? <p className="text-center py-8 text-muted-foreground">No appointments yet</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>TX Hash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map(appt => (
                        <TableRow key={appt.id}>
                          <TableCell>{new Date(appt.appointment_date).toLocaleString()}</TableCell>
                          <TableCell>{appt.reason}</TableCell>
                          <TableCell>
                            <Badge className={
                              appt.status === 'approved' ? 'bg-success' :
                              appt.status === 'rejected' ? 'bg-destructive' :
                              appt.status === 'completed' ? 'bg-primary' : 'bg-warning'
                            }>
                              {appt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {appt.tx_hash ? (
                              <a href={`https://sepolia.etherscan.io/tx/${appt.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-mono">
                                {appt.tx_hash.slice(0, 12)}...
                              </a>
                            ) : '--'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain">
            <PatientBlockchainHistory patientId={patient.id} patientName={patient.name} />
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Alert History</CardTitle></CardHeader>
              <CardContent>
                {alerts.length === 0 ? <p className="text-center py-8 text-muted-foreground">No alerts</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {alerts.map(alert => (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">{alert.alert_type}</TableCell>
                          <TableCell><Badge className={alert.severity === 'critical' ? 'bg-destructive' : 'bg-warning'}>{alert.severity}</Badge></TableCell>
                          <TableCell className="text-sm">{alert.message}</TableCell>
                          <TableCell><Badge variant={alert.acknowledged ? 'secondary' : 'outline'}>{alert.acknowledged ? 'Acknowledged' : 'Active'}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
