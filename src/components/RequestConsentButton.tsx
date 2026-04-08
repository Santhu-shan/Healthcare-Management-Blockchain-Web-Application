import { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { storeVitalsOnChain } from '@/lib/ethereum';

interface RequestConsentButtonProps {
  patientId: string;
  doctorId: string;
}

export function RequestConsentButton({ patientId, doctorId }: RequestConsentButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [accessType, setAccessType] = useState('read');
  const [loading, setLoading] = useState(false);

  const handleRequestConsent = async () => {
    setLoading(true);
    try {
      // Try to store consent on blockchain
      let txHash: string | undefined;
      try {
        const consentData = {
          heart_rate: 0, spo2: 0, temperature: 0,
          blood_pressure_systolic: null, blood_pressure_diastolic: null,
          respiratory_rate: null,
          recorded_at: new Date().toISOString(),
          status: `CONSENT_REQUEST:${accessType}:${patientId}:${doctorId}`,
        };
        const result = await storeVitalsOnChain(patientId, consentData);
        if (result.success) txHash = result.txHash;
      } catch {
        // MetaMask not available - continue without blockchain
      }

      await supabase.from('consents').insert({
        patient_id: patientId,
        doctor_id: doctorId,
        access_type: accessType,
        blockchain_tx_hash: txHash || null,
        status: 'active',
      });

      toast({ title: 'Consent requested', description: txHash ? 'Recorded on blockchain' : 'Saved to database' });
      setOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          Request Consent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Patient Consent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Access Type</Label>
            <Select value={accessType} onValueChange={setAccessType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read Only</SelectItem>
                <SelectItem value="read_write">Read & Write</SelectItem>
                <SelectItem value="full">Full Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            This will create a consent record and optionally store the hash on the Ethereum Sepolia blockchain via MetaMask.
          </p>
          <Button onClick={handleRequestConsent} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {loading ? 'Processing...' : 'Submit Consent Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
