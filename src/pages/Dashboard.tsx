import { useState, useEffect } from 'react';
import { Users, AlertTriangle, Activity, Boxes } from 'lucide-react';
import Layout from '@/components/Layout';
import PatientCard from '@/components/PatientCard';
import AlertPanel from '@/components/AlertPanel';
import StatsCard from '@/components/StatsCard';
import BlockchainDashboardWidget from '@/components/BlockchainDashboardWidget';
import IntegrityAlertSystem from '@/components/IntegrityAlertSystem';
import { supabase } from '@/integrations/supabase/client';
import { PatientWithVitals, Vital, AlertLog } from '@/types';
import { generateVitals, generatePatientData } from '@/lib/vitalsSimulator';
import { createBlock, GENESIS_HASH } from '@/lib/blockchainSimulator';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [patients, setPatients] = useState<PatientWithVitals[]>([]);
  const [alerts, setAlerts] = useState<(AlertLog & { patient_name?: string })[]>([]);
  const [blockCount, setBlockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    initializeData();
  }, []);

  // Real-time vitals simulation
  useEffect(() => {
    if (patients.length === 0) return;
    const interval = setInterval(() => simulateVitals(), 5000);
    return () => clearInterval(interval);
  }, [patients]);

  const initializeData = async () => {
    try {
      let { data: existingPatients } = await supabase.from('patients').select('*');
      
      if (!existingPatients || existingPatients.length === 0) {
        const newPatients = generatePatientData();
        const { data: inserted } = await supabase.from('patients').insert(newPatients).select();
        existingPatients = inserted;
      }

      const { data: vitalsData } = await supabase.from('vitals').select('*').order('recorded_at', { ascending: false });
      const { data: alertsData } = await supabase.from('alert_logs').select('*').order('created_at', { ascending: false }).limit(20);
      const { count } = await supabase.from('blockchain_records').select('*', { count: 'exact', head: true });

      const patientsWithVitals = (existingPatients || []).map(p => ({
        ...p,
        latestVitals: vitalsData?.find(v => v.patient_id === p.id) as Vital | undefined
      }));

      setPatients(patientsWithVitals);
      setAlerts((alertsData || []).map(a => ({ ...a, patient_name: patientsWithVitals.find(p => p.id === a.patient_id)?.name })) as (AlertLog & { patient_name?: string })[]);
      setBlockCount(count || 0);
    } catch (err) {
      console.error('Error loading data:', err);
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
      // Update local state
      setPatients(prev => prev.map(p => p.id === randomPatient.id ? { ...p, latestVitals: vitalRecord as Vital } : p));

      // Create blockchain record
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

      // Create alerts if needed
      if (vitals.alertDetails && vitals.alertDetails.length > 0) {
        for (const alert of vitals.alertDetails) {
          await supabase.from('alert_logs').insert({
            patient_id: randomPatient.id,
            vital_id: vitalRecord.id,
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
          });
        }
        setAlerts(prev => [...vitals.alertDetails!.map(a => ({
          id: crypto.randomUUID(),
          patient_id: randomPatient.id,
          vital_id: vitalRecord.id,
          alert_type: a.type,
          severity: a.severity as 'warning' | 'critical',
          message: a.message,
          acknowledged: false,
          acknowledged_by: null,
          created_at: new Date().toISOString(),
          patient_name: randomPatient.name,
        })), ...prev].slice(0, 20));
      }
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    await supabase.from('alert_logs').update({ acknowledged: true }).eq('id', alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    toast({ title: 'Alert acknowledged' });
  };

  const alertCount = patients.filter(p => p.latestVitals?.status === 'ALERT').length;
  const normalCount = patients.filter(p => p.latestVitals?.status === 'NORMAL').length;

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Patient Monitoring Dashboard</h1>
          <p className="text-muted-foreground">Real-time vitals with blockchain-secured records</p>
        </div>

        {/* Integrity Alert System - shows when tampering detected */}
        <IntegrityAlertSystem autoCheck={true} checkIntervalMs={60000} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Patients" value={patients.length} icon={Users} subtitle="Under monitoring" />
          <StatsCard title="Active Alerts" value={alertCount} icon={AlertTriangle} variant="alert" subtitle="Require attention" />
          <StatsCard title="Normal Status" value={normalCount} icon={Activity} variant="success" subtitle="Vitals stable" />
          <StatsCard title="Blockchain Blocks" value={blockCount} icon={Boxes} subtitle="Records secured" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Patient Grid</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {patients.map(patient => <PatientCard key={patient.id} patient={patient} />)}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <BlockchainDashboardWidget />
            <AlertPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
