import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ShieldX, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { generateDataHash } from '@/lib/ethereum';
import { useToast } from '@/hooks/use-toast';

interface IntegrityAlert {
  id: string;
  txId: string;
  txHash: string;
  patientName: string;
  expectedHash: string;
  actualHash: string;
  detectedAt: string;
  dismissed: boolean;
}

interface IntegrityAlertSystemProps {
  autoCheck?: boolean;
  checkIntervalMs?: number;
}

export default function IntegrityAlertSystem({
  autoCheck = true,
  checkIntervalMs = 60000, // 1 minute default
}: IntegrityAlertSystemProps) {
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const { toast } = useToast();

  const checkIntegrity = useCallback(async () => {
    setChecking(true);
    try {
      // Fetch unverified successful transactions with their vitals
      const { data: transactions, error } = await supabase
        .from('blockchain_transactions')
        .select(`
          id,
          tx_hash,
          data_hash,
          verified,
          patients (name),
          vitals (*)
        `)
        .eq('status', 'success')
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const newAlerts: IntegrityAlert[] = [];

      for (const tx of transactions || []) {
        if (!tx.vitals) continue;

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

        if (localHash !== tx.data_hash) {
          newAlerts.push({
            id: crypto.randomUUID(),
            txId: tx.id,
            txHash: tx.tx_hash,
            patientName: (tx.patients as { name: string } | null)?.name || 'Unknown',
            expectedHash: tx.data_hash,
            actualHash: localHash,
            detectedAt: new Date().toISOString(),
            dismissed: false,
          });
        }
      }

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
        
        // Show toast for new tampering alerts
        toast({
          title: '⚠️ Data Integrity Alert',
          description: `${newAlerts.length} potential tampering attempt(s) detected`,
          variant: 'destructive',
        });

        // Log to audit trail and send email notifications
        for (const alert of newAlerts) {
          // Log to blockchain_audit_trail table
          await supabase.from('blockchain_audit_trail').insert({
            action: 'INTEGRITY_VIOLATION_DETECTED',
            verification_hash: alert.actualHash,
            integrity_verified: false,
          });

          // Send email notification via edge function
          try {
            const { data, error: emailError } = await supabase.functions.invoke('send-integrity-alert', {
              body: {
                txHash: alert.txHash,
                patientId: alert.txId,
                expectedHash: alert.expectedHash,
                actualHash: alert.actualHash,
                detectedAt: alert.detectedAt,
              },
            });
            
            if (emailError) {
              console.error('Failed to send integrity alert email:', emailError);
            } else if (data?.emailSent) {
              console.log('Integrity alert email sent successfully');
            } else {
              console.log('Email notification skipped:', data?.message);
            }
          } catch (emailErr) {
            console.error('Error calling send-integrity-alert function:', emailErr);
          }
        }
      }

      setLastCheck(new Date());
    } catch (error: any) {
      console.error('Integrity check failed:', error);
    } finally {
      setChecking(false);
    }
  }, [toast]);

  useEffect(() => {
    if (autoCheck) {
      // Initial check
      checkIntegrity();

      // Set up interval
      const interval = setInterval(checkIntegrity, checkIntervalMs);
      return () => clearInterval(interval);
    }
  }, [autoCheck, checkIntervalMs, checkIntegrity]);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, dismissed: true } : a))
    );
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const shortenHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Data Integrity Alerts
          <Badge variant="destructive" className="ml-2">
            {activeAlerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className="border border-destructive/30 rounded-lg p-3 bg-background space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShieldX className="h-4 w-4 text-destructive" />
                <span className="font-medium text-sm">{alert.patientName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Transaction:</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${alert.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {shortenHash(alert.txHash)}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Expected:</span>
                <code className="font-mono text-xs bg-muted px-1 rounded">
                  {shortenHash(alert.expectedHash)}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Actual:</span>
                <code className="font-mono text-xs bg-destructive/20 text-destructive px-1 rounded">
                  {shortenHash(alert.actualHash)}
                </code>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Detected: {new Date(alert.detectedAt).toLocaleString()}
            </div>
          </div>
        ))}

        {lastCheck && (
          <p className="text-xs text-muted-foreground text-center">
            Last integrity check: {lastCheck.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
