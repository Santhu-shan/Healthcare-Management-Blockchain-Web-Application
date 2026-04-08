import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import Layout from '@/components/Layout';
import VitalsChart from '@/components/VitalsChart';
import PatientBlockchainHistory from '@/components/PatientBlockchainHistory';
import { RequestConsentButton } from '@/components/RequestConsentButton';
import { NewPrescriptionForm } from '@/components/NewPrescriptionForm';
import { PrescriptionList } from '@/components/PrescriptionList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Patient, Vital } from '@/types';
import { generateHealthReportPDF, exportVitalsCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

export default function PatientDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rxRefreshKey, setRxRefreshKey] = useState(0);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const [patientRes, vitalsRes, txRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase.from('vitals').select('*').eq('patient_id', id).order('recorded_at', { ascending: true }).limit(50),
      supabase.from('blockchain_transactions').select('tx_hash').eq('patient_id', id!),
    ]);
    setPatient(patientRes.data as Patient | null);
    setVitals((vitalsRes.data || []) as Vital[]);
    setTxHashes((txRes.data || []).map(t => t.tx_hash));

    // Get current doctor id for consent
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: doctor } = await supabase.from('doctors').select('id').eq('user_id', user.id).single();
      if (doctor) setDoctorId(doctor.id);
    }
    setLoading(false);
  };

  const handleExportPDF = async () => {
    if (!patient) return;
    await generateHealthReportPDF(
      patient.name,
      { age: patient.age, gender: patient.gender, room: patient.room_number, diagnosis: patient.diagnosis, admitted: patient.admission_date },
      vitals, txHashes.length > 0, txHashes
    );
    toast({ title: 'PDF Report downloaded' });
  };

  const handleExportCSV = () => {
    if (!patient) return;
    exportVitalsCSV(vitals, patient.name);
    toast({ title: 'CSV exported' });
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;
  if (!patient) return <Layout><div className="text-center py-8">Patient not found</div></Layout>;

  const latestVital = vitals[vitals.length - 1];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/patients"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-display">{patient.name}</h1>
            <p className="text-muted-foreground">Room {patient.room_number} • {patient.age}y • {patient.gender}</p>
          </div>
          {latestVital && (
            <Badge className={latestVital.status === 'ALERT' ? 'bg-alert' : 'bg-success'}>
              {latestVital.status}
            </Badge>
          )}
          <div className="flex gap-2">
            {doctorId && <RequestConsentButton patientId={patient.id} doctorId={doctorId} />}
            {doctorId && (
              <NewPrescriptionForm
                patientId={patient.id}
                doctorId={doctorId}
                onCreated={() => setRxRefreshKey(k => k + 1)}
              />
            )}
            <QRCodeGenerator
              patientId={patient.id}
              patientName={patient.name}
              blockHash={txHashes[0]}
              etherscanTxHash={txHashes[0]}
              tamperStatus={txHashes.length > 0 ? 'verified' : 'unknown'}
            />
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
              <FileText className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Patient Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Diagnosis:</span><p className="font-medium">{patient.diagnosis || 'N/A'}</p></div>
            <div><span className="text-muted-foreground">Admitted:</span><p className="font-medium">{new Date(patient.admission_date).toLocaleDateString()}</p></div>
            <div><span className="text-muted-foreground">Room:</span><p className="font-medium">{patient.room_number}</p></div>
            <div><span className="text-muted-foreground">Age:</span><p className="font-medium">{patient.age} years</p></div>
          </CardContent>
        </Card>

        <Tabs defaultValue="vitals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vitals">Vitals Charts</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain History</TabsTrigger>
          </TabsList>

          <TabsContent value="vitals">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <VitalsChart vitals={vitals} type="heart_rate" title="Heart Rate" />
              <VitalsChart vitals={vitals} type="temperature" title="Body Temperature" />
              <VitalsChart vitals={vitals} type="spo2" title="Oxygen Saturation (SpO₂)" />
            </div>
          </TabsContent>

          <TabsContent value="prescriptions">
            <PrescriptionList patientId={patient.id} showDoctorActions refreshKey={rxRefreshKey} />
          </TabsContent>

          <TabsContent value="blockchain">
            <PatientBlockchainHistory patientId={patient.id} patientName={patient.name} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
