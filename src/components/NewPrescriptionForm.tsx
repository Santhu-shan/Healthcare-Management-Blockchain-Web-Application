import { useState } from 'react';
import { Pill, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEthereum } from '@/hooks/useEthereum';

interface NewPrescriptionFormProps {
  patientId: string;
  doctorId: string;
  onCreated?: () => void;
}

export function NewPrescriptionForm({ patientId, doctorId, onCreated }: NewPrescriptionFormProps) {
  const { toast } = useToast();
  const { wallet, storeVitals } = useEthereum();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'once_daily',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });

  const frequencyOptions = [
    { value: 'once_daily', label: 'Once Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'three_times_daily', label: 'Three Times Daily' },
    { value: 'every_6_hours', label: 'Every 6 Hours' },
    { value: 'every_8_hours', label: 'Every 8 Hours' },
    { value: 'every_12_hours', label: 'Every 12 Hours' },
    { value: 'as_needed', label: 'As Needed (PRN)' },
    { value: 'weekly', label: 'Weekly' },
  ];

  const handleSubmit = async () => {
    if (!form.medicine_name || !form.dosage) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let blockchainHash: string | null = null;

      // Try to store on blockchain if wallet connected
      if (wallet.isConnected && wallet.isCorrectNetwork) {
        const result = await storeVitals(patientId, {
          type: 'prescription',
          medicine: form.medicine_name,
          dosage: form.dosage,
          frequency: form.frequency,
          doctor_id: doctorId,
        });
        if (result.success && result.txHash) {
          blockchainHash = result.txHash;
        }
      }

      const { error } = await supabase.from('prescriptions').insert({
        patient_id: patientId,
        doctor_id: doctorId,
        medicine_name: form.medicine_name,
        dosage: form.dosage,
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
        blockchain_hash: blockchainHash,
      });

      if (error) throw error;

      toast({
        title: 'Prescription created',
        description: blockchainHash ? 'Verified on blockchain ✓' : 'Saved successfully',
      });
      setOpen(false);
      setForm({ medicine_name: '', dosage: '', frequency: 'once_daily', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' });
      onCreated?.();
    } catch (err: any) {
      toast({ title: 'Error creating prescription', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Pill className="h-4 w-4" />
          New Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            New Prescription
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Medicine Name *</Label>
            <Input
              value={form.medicine_name}
              onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))}
              placeholder="e.g. Amoxicillin 500mg"
            />
          </div>
          <div>
            <Label>Dosage *</Label>
            <Input
              value={form.dosage}
              onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
              placeholder="e.g. 1 tablet"
            />
          </div>
          <div>
            <Label>Frequency</Label>
            <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional instructions..."
              rows={2}
            />
          </div>

          {wallet.isConnected && wallet.isCorrectNetwork && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Shield className="h-4 w-4 text-primary" />
              Prescription will be recorded on Sepolia blockchain
            </div>
          )}

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Create Prescription'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
