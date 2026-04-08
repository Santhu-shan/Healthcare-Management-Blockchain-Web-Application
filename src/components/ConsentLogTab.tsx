import { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface ConsentRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  access_type: string;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  blockchain_tx_hash: string | null;
  status: string;
  created_at: string;
}

export function ConsentLogTab() {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    const { data } = await supabase
      .from('consents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setConsents((data || []) as ConsentRecord[]);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-32">Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Consent Blockchain Log
        </CardTitle>
        <CardDescription>All consent records with blockchain verification</CardDescription>
      </CardHeader>
      <CardContent>
        {consents.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No consent records found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Access Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Blockchain Tx</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consents.map(consent => (
                <TableRow key={consent.id}>
                  <TableCell className="font-mono text-xs">{consent.patient_id.slice(0, 8)}...</TableCell>
                  <TableCell className="capitalize">{consent.access_type}</TableCell>
                  <TableCell>
                    <Badge className={
                      consent.status === 'active' ? 'bg-success' :
                      consent.status === 'revoked' ? 'bg-alert' : 'bg-warning'
                    }>
                      {consent.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(consent.granted_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {consent.blockchain_tx_hash ? (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${consent.blockchain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs font-mono flex items-center gap-1"
                      >
                        {consent.blockchain_tx_hash.slice(0, 10)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">Off-chain</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
