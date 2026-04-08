import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, FileCheck, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatHash, generateDataHash } from '@/lib/ethereum';

interface Patient {
  id: string;
  name: string;
}

interface Vital {
  id: string;
  heart_rate: number;
  spo2: number;
  temperature: number;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  respiratory_rate: number | null;
  recorded_at: string;
  status: string;
}

interface StoreVitalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletConnected: boolean;
  walletAddress: string | null;
  onStoreVitals: (patientId: string, vitals: Vital) => Promise<{ success: boolean; txHash?: string; error?: string; blockNumber?: number; gasUsed?: string }>;
  onTransactionComplete?: () => void;
}

type TransactionStep = 'select' | 'preparing' | 'signing' | 'pending' | 'success' | 'error';

export function StoreVitalsModal({
  open,
  onOpenChange,
  walletConnected,
  walletAddress,
  onStoreVitals,
  onTransactionComplete,
}: StoreVitalsModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [selectedVital, setSelectedVital] = useState<Vital | null>(null);
  const [step, setStep] = useState<TransactionStep>('select');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPatients();
      setStep('select');
      setSelectedPatient('');
      setSelectedVital(null);
      setTxHash(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedPatient) {
      loadVitals(selectedPatient);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    const { data } = await supabase.from('patients').select('id, name').limit(50);
    setPatients(data || []);
  };

  const loadVitals = async (patientId: string) => {
    const { data } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(10);
    setVitals(data || []);
    if (data && data.length > 0) {
      setSelectedVital(data[0]);
    }
  };

  const handleStoreVitals = async () => {
    if (!selectedPatient || !selectedVital || !walletAddress) return;

    setStep('preparing');
    setError(null);

    try {
      // Short delay to show preparing state
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep('signing');

      const result = await onStoreVitals(selectedPatient, selectedVital);

      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        setStep('pending');
        
        // Generate data hash for verification
        const dataHash = await generateDataHash({
          heart_rate: selectedVital.heart_rate,
          spo2: selectedVital.spo2,
          temperature: selectedVital.temperature,
          blood_pressure_systolic: selectedVital.blood_pressure_systolic,
          blood_pressure_diastolic: selectedVital.blood_pressure_diastolic,
          respiratory_rate: selectedVital.respiratory_rate,
          recorded_at: selectedVital.recorded_at,
          status: selectedVital.status,
        });

        // Save transaction to database
        const vitalsSummary = {
          hr: selectedVital.heart_rate,
          spo2: selectedVital.spo2,
          temp: selectedVital.temperature,
          bp: selectedVital.blood_pressure_systolic && selectedVital.blood_pressure_diastolic
            ? `${selectedVital.blood_pressure_systolic}/${selectedVital.blood_pressure_diastolic}`
            : null,
          rr: selectedVital.respiratory_rate,
          status: selectedVital.status,
          timestamp: selectedVital.recorded_at,
        };

        await supabase.from('blockchain_transactions').insert({
          patient_id: selectedPatient,
          vital_id: selectedVital.id,
          tx_hash: result.txHash,
          block_number: result.blockNumber || null,
          from_address: walletAddress,
          gas_used: result.gasUsed || null,
          data_hash: dataHash,
          vitals_summary: vitalsSummary,
          status: 'success',
        });

        setStep('success');
        
        // Notify parent to refresh transaction list
        if (onTransactionComplete) {
          onTransactionComplete();
        }
      } else {
        setError(result.error || 'Transaction failed');
        setStep('error');
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setStep('error');
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'select':
        return (
          <>
            <div className="space-y-4">
              {!walletConnected && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">Wallet not connected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please connect your MetaMask wallet to store records on the blockchain.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPatient && vitals.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Vitals Record</Label>
                  <Select
                    value={selectedVital?.id || ''}
                    onValueChange={(id) => setSelectedVital(vitals.find(v => v.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a vitals record..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vitals.map((vital) => (
                        <SelectItem key={vital.id} value={vital.id}>
                          {new Date(vital.recorded_at).toLocaleString()} - HR: {vital.heart_rate} BPM
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedVital && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium">Selected Vitals Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Heart Rate: <span className="font-mono">{selectedVital.heart_rate} BPM</span></div>
                    <div>SpO2: <span className="font-mono">{selectedVital.spo2}%</span></div>
                    <div>Temp: <span className="font-mono">{selectedVital.temperature}°C</span></div>
                    <div>Status: <Badge variant="outline">{selectedVital.status}</Badge></div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStoreVitals}
                disabled={!walletConnected || !selectedPatient || !selectedVital}
              >
                Sign & Store on Blockchain
              </Button>
            </DialogFooter>
          </>
        );

      case 'preparing':
        return (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Preparing Transaction</h3>
              <p className="text-muted-foreground">Generating data hash and preparing contract call...</p>
            </div>
          </div>
        );

      case 'signing':
        return (
          <div className="py-12 text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Confirm in MetaMask</h3>
              <p className="text-muted-foreground">Please sign the transaction in your MetaMask wallet...</p>
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-consensus" />
            <div>
              <h3 className="font-semibold text-lg">Transaction Pending</h3>
              <p className="text-muted-foreground">Waiting for blockchain confirmation...</p>
              {txHash && (
                <p className="mt-2 text-sm font-mono text-muted-foreground">{formatHash(txHash)}</p>
              )}
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="py-12 text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-consensus/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-consensus" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-consensus">Transaction Confirmed!</h3>
              <p className="text-muted-foreground">Patient vitals have been stored on the Ethereum blockchain.</p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-4 text-primary hover:underline"
                >
                  View on Etherscan <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        );

      case 'error':
        return (
          <div className="py-12 text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-destructive">Transaction Failed</h3>
              <p className="text-muted-foreground">{error || 'An error occurred while processing the transaction.'}</p>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStep('select')}>Try Again</Button>
            </DialogFooter>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Store Vitals on Blockchain</DialogTitle>
          <DialogDescription>
            Sign and submit patient vitals to the Ethereum Sepolia testnet via MetaMask.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
