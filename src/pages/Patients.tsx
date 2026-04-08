import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Layout from '@/components/Layout';
import PatientCard from '@/components/PatientCard';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { PatientWithVitals, Vital } from '@/types';

export default function Patients() {
  const [patients, setPatients] = useState<PatientWithVitals[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const { data: patientsData } = await supabase.from('patients').select('*');
    const { data: vitalsData } = await supabase.from('vitals').select('*').order('recorded_at', { ascending: false });
    
    const patientsWithVitals = (patientsData || []).map(p => ({
      ...p,
      latestVitals: vitalsData?.find(v => v.patient_id === p.id) as Vital | undefined
    }));
    
    setPatients(patientsWithVitals);
    setLoading(false);
  };

  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.room_number.includes(search)
  );

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Patients</h1>
            <p className="text-muted-foreground">Monitor all patients under care</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(patient => <PatientCard key={patient.id} patient={patient} />)}
        </div>
      </div>
    </Layout>
  );
}
