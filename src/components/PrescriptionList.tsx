import { useState, useEffect } from 'react';
import { Pill, Shield, ShieldCheck, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Prescription } from '@/types';

interface PrescriptionListProps {
  patientId: string;
  showDoctorActions?: boolean;
  refreshKey?: number;
}

export function PrescriptionList({ patientId, showDoctorActions, refreshKey }: PrescriptionListProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescriptions();
  }, [patientId, refreshKey]);

  const loadPrescriptions = async () => {
    const { data } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    setPrescriptions((data || []) as Prescription[]);
    setLoading(false);
  };

  const handleDischarge = async (id: string) => {
    await supabase.from('prescriptions').update({ status: 'completed' }).eq('id', id);
    loadPrescriptions();
  };

  const frequencyLabel = (f: string) => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) return <div className="text-center py-4 text-muted-foreground">Loading prescriptions...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Prescriptions
        </CardTitle>
        <CardDescription>{prescriptions.length} prescription(s) found</CardDescription>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No prescriptions yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Blockchain</TableHead>
                {showDoctorActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map(rx => (
                <TableRow key={rx.id}>
                  <TableCell className="font-medium">{rx.medicine_name}</TableCell>
                  <TableCell>{rx.dosage}</TableCell>
                  <TableCell className="text-sm">{frequencyLabel(rx.frequency)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(rx.start_date).toLocaleDateString()}
                    {rx.end_date ? ` → ${new Date(rx.end_date).toLocaleDateString()}` : ' → Ongoing'}
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
                  {showDoctorActions && (
                    <TableCell className="text-right">
                      {rx.status === 'active' && (
                        <Button size="sm" variant="outline" onClick={() => handleDischarge(rx.id)}>
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
