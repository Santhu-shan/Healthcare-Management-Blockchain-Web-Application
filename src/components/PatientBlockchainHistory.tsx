import { useState, useEffect } from 'react';
import { ExternalLink, Shield, ShieldCheck, ShieldX, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { generateDataHash } from '@/lib/ethereum';
import { useToast } from '@/hooks/use-toast';

interface BlockchainTransaction {
  id: string;
  tx_hash: string;
  block_number: number | null;
  from_address: string;
  data_hash: string;
  vitals_summary: {
    heart_rate?: number;
    spo2?: number;
    temperature?: number;
    status?: string;
    timestamp?: string;
  };
  status: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  vitals?: {
    heart_rate: number;
    spo2: number;
    temperature: number;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    respiratory_rate: number | null;
    recorded_at: string;
    status: string;
  } | null;
}

interface PatientBlockchainHistoryProps {
  patientId: string;
  patientName: string;
}

export default function PatientBlockchainHistory({ patientId, patientName }: PatientBlockchainHistoryProps) {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, [patientId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blockchain_transactions')
        .select(`
          *,
          vitals (*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as BlockchainTransaction[]);
    } catch (error: any) {
      console.error('Failed to load patient blockchain history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (tx: BlockchainTransaction) => {
    setVerifying(tx.id);
    try {
      let isValid = false;

      if (tx.vitals) {
        const vitalsData = {
          heart_rate: tx.vitals.heart_rate,
          spo2: tx.vitals.spo2,
          temperature: tx.vitals.temperature,
          blood_pressure_systolic: tx.vitals.blood_pressure_systolic,
          blood_pressure_diastolic: tx.vitals.blood_pressure_diastolic,
          respiratory_rate: tx.vitals.respiratory_rate,
          recorded_at: tx.vitals.recorded_at,
          status: tx.vitals.status,
        };

        const localHash = await generateDataHash(vitalsData);
        isValid = localHash === tx.data_hash;
      }

      if (isValid) {
        await supabase
          .from('blockchain_transactions')
          .update({ verified: true, verified_at: new Date().toISOString() })
          .eq('id', tx.id);

        setTransactions(prev =>
          prev.map(t =>
            t.id === tx.id
              ? { ...t, verified: true, verified_at: new Date().toISOString() }
              : t
          )
        );

        toast({
          title: 'Verification Successful',
          description: 'On-chain data matches local records',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Data integrity issue detected - possible tampering',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setVerifying(null);
    }
  };

  const shortenHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-6)}`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Blockchain Records
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Blockchain Records for {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No blockchain records found for this patient
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {shortenHash(tx.tx_hash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {tx.status === 'success' && (
                        <Badge variant="outline" className="text-success border-success">
                          Confirmed
                        </Badge>
                      )}
                      {tx.status === 'pending' && (
                        <Badge variant="outline" className="text-warning border-warning">
                          Pending
                        </Badge>
                      )}
                    </div>
                    {tx.block_number && (
                      <p className="text-xs text-muted-foreground">
                        Block #{tx.block_number.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.verified ? (
                      <Badge className="bg-success/10 text-success border-success">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : tx.status === 'success' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(tx)}
                        disabled={verifying === tx.id}
                      >
                        {verifying === tx.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Shield className="h-3 w-3 mr-1" />
                        )}
                        Verify
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground text-xs">Heart Rate</p>
                    <p className="font-semibold">{tx.vitals_summary.heart_rate || '--'}</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground text-xs">SpO₂</p>
                    <p className="font-semibold">{tx.vitals_summary.spo2 || '--'}%</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground text-xs">Temp</p>
                    <p className="font-semibold">{tx.vitals_summary.temperature || '--'}°C</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className={`font-semibold ${tx.vitals_summary.status === 'ALERT' ? 'text-alert' : 'text-success'}`}>
                      {tx.vitals_summary.status || '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(tx.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
