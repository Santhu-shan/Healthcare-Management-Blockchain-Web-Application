import { useState, useEffect } from 'react';
import { Users, AlertTriangle, Activity, Boxes, Calendar, Clock, Heart, Stethoscope } from 'lucide-react';
import Layout from '@/components/Layout';
import PatientCard from '@/components/PatientCard';
import AlertPanel from '@/components/AlertPanel';
import StatsCard from '@/components/StatsCard';
import BlockchainDashboardWidget from '@/components/BlockchainDashboardWidget';
import IntegrityAlertSystem from '@/components/IntegrityAlertSystem';
import VitalsChart from '@/components/VitalsChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PatientWithVitals, Vital, AlertLog } from '@/types';
import { generateVitals } from '@/lib/vitalsSimulator';
import { createBlock, GENESIS_HASH } from '@/lib/blockchainSimulator';
import { useToast } from '@/hooks/use-toast';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithVitals[]>([]);
  const [alerts, setAlerts] = useState<(AlertLog & { patient_name?: string })[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blockCount, setBlockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPatientVitals, setSelectedPatientVitals] = useState<Vital[]>([]);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const { toast } = useToast();

  useEffect(() => { initializeData(); }, []);

  useEffect(() => {
    if (patients.length === 0) return;
    const interval = setInterval(() => simulateVitals(), 5000);
    return () => clearInterval(interval);
  }, [patients]);

  const initializeData = async () => {
    try {
      const { data: existingPatients } = await supabase.from('patients').select('*');
      const { data: vitalsData } = await supabase.from('vitals').select('*').order('recorded_at', { ascending: false });
      const { data: alertsData } = await supabase.from('alert_logs').select('*').order('created_at', { ascending: false }).limit(20);
      const { count } = await supabase.from('blockchain_records').select('*', { count: 'exact', head: true });
      const { data: apptsData } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true });

      const patientsWithVitals = (existingPatients || []).map(p => ({
        ...p,
        latestVitals: vitalsData?.find(v => v.patient_id === p.id) as Vital | undefined,
      }));

      setPatients(patientsWithVitals);
      setAlerts((alertsData || []).map(a => ({ ...a, patient_name: patientsWithVitals.find(p => p.id === a.patient_id)?.name })) as any);
      setBlockCount(count || 0);
      setAppointments(apptsData || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const simulateVitals = async () => {
    if (patients.length === 0) return;
    const randomPatient = patients[Math.floor(Math.random() * patients.length)];
    const vitals = generateVitals();

    const { data: vitalRecord } = await supabase.from('vitals').insert({
      patient_id: randomPatient.id,
      heart_rate: vitals.heart_rate,
      temperature: vitals.temperature,
      spo2: vitals.spo2,
      status: vitals.status,
    }).select().single();

    if (vitalRecord) {
      setPatients(prev => prev.map(p => p.id === randomPatient.id ? { ...p, latestVitals: vitalRecord as Vital } : p));

      const { count } = await supabase.from('blockchain_records').select('*', { count: 'exact', head: true });
      const { data: lastBlock } = await supabase.from('blockchain_records').select('current_hash').order('block_number', { ascending: false }).limit(1).single();

      const block = createBlock(
        (count || 0) + 1,
        lastBlock?.current_hash || GENESIS_HASH,
        randomPatient.id,
        vitalRecord.id,
        randomPatient.name,
        { heart_rate: vitals.heart_rate, temperature: vitals.temperature, spo2: vitals.spo2, status: vitals.status }
      );

      await supabase.from('blockchain_records').insert(block);
      setBlockCount((count || 0) + 1);

      if (vitals.alertDetails && vitals.alertDetails.length > 0) {
        for (const alert of vitals.alertDetails) {
          await supabase.from('alert_logs').insert({ patient_id: randomPatient.id, vital_id: vitalRecord.id, alert_type: alert.type, severity: alert.severity, message: alert.message });
        }
        setAlerts(prev => [...vitals.alertDetails!.map(a => ({
          id: crypto.randomUUID(), patient_id: randomPatient.id, vital_id: vitalRecord.id, alert_type: a.type, severity: a.severity as any, message: a.message, acknowledged: false, acknowledged_by: null, created_at: new Date().toISOString(), patient_name: randomPatient.name,
        })), ...prev].slice(0, 20));
      }
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    await supabase.from('alert_logs').update({ acknowledged: true }).eq('id', alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    toast({ title: 'Alert acknowledged' });
  };

  const handleViewPatientVitals = async (patientId: string, patientName: string) => {
    const { data } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: true }).limit(100);
    setSelectedPatientVitals((data || []) as Vital[]);
    setSelectedPatientName(patientName);
  };

  const alertCount = patients.filter(p => p.latestVitals?.status === 'ALERT').length;
  const normalCount = patients.filter(p => p.latestVitals?.status === 'NORMAL').length;
  const myAppointments = appointments.filter(a => a.status === 'approved');

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2"><Stethoscope className="h-8 w-8 text-primary" /> Doctor Dashboard</h1>
          <p className="text-muted-foreground">Real-time patient monitoring with blockchain-secured records</p>
        </div>

        <IntegrityAlertSystem autoCheck={true} checkIntervalMs={60000} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard title="Total Patients" value={patients.length} icon={Users} subtitle="Under monitoring" />
          <StatsCard title="Active Alerts" value={alertCount} icon={AlertTriangle} variant="alert" subtitle="Require attention" />
          <StatsCard title="Normal Status" value={normalCount} icon={Activity} variant="success" subtitle="Vitals stable" />
          <StatsCard title="Blockchain Blocks" value={blockCount} icon={Boxes} subtitle="Records secured" />
          <StatsCard title="Appointments" value={myAppointments.length} icon={Calendar} subtitle="Approved" />
        </div>

        <Tabs defaultValue="monitoring" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monitoring">Patient Monitoring</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="vitals-detail">Vital Details</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-lg font-semibold">Patient Grid</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {patients.map(patient => (
                    <div key={patient.id} onClick={() => handleViewPatientVitals(patient.id, patient.name)} className="cursor-pointer">
                      <PatientCard patient={patient} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <BlockchainDashboardWidget />
                <AlertPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> My Appointments</CardTitle></CardHeader>
              <CardContent>
                {myAppointments.length === 0 ? <p className="text-center py-8 text-muted-foreground">No appointments assigned yet</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {myAppointments.map(appt => {
                        const pat = patients.find(p => p.id === appt.patient_id);
                        return (
                          <TableRow key={appt.id}>
                            <TableCell className="font-medium">{pat?.name || 'Unknown'}</TableCell>
                            <TableCell>{new Date(appt.appointment_date).toLocaleString()}</TableCell>
                            <TableCell>{appt.reason}</TableCell>
                            <TableCell><Badge className="bg-success">{appt.status}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vitals-detail">
            {selectedPatientName ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Vitals for {selectedPatientName}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <VitalsChart vitals={selectedPatientVitals} type="heart_rate" title="Heart Rate" />
                  <VitalsChart vitals={selectedPatientVitals} type="temperature" title="Temperature" />
                  <VitalsChart vitals={selectedPatientVitals} type="spo2" title="SpO₂" />
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Click a patient card in the Monitoring tab to view their vital details</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
