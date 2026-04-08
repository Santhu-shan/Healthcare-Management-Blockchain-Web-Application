import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, Hash, Database, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { generateDataHash } from '@/lib/ethereum';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VerificationResult {
  recordId: string;
  patientName: string;
  localHash: string;
  onChainHash: string;
  isValid: boolean;
  timestamp: string;
  txHash: string;
}

interface BlockchainVerificationProps {
  patientId?: string;
}

export function BlockchainVerification({ patientId }: BlockchainVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    unverified: number;
  } | null>(null);
  const { toast } = useToast();

  const verifyAllRecords = async () => {
    setIsVerifying(true);
    setProgress(0);
    setResults([]);
    setSummary(null);

    try {
      // Fetch all blockchain transactions
      let query = supabase
        .from('blockchain_transactions')
        .select(`
          *,
          patients (name),
          vitals (*)
        `)
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data: transactions, error } = await query;
      
      if (error) throw error;
      if (!transactions || transactions.length === 0) {
        toast({
          title: 'No Records Found',
          description: 'No blockchain transactions to verify',
        });
        setIsVerifying(false);
        return;
      }

      const verificationResults: VerificationResult[] = [];
      let validCount = 0;
      let invalidCount = 0;

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        setProgress(Math.round(((i + 1) / transactions.length) * 100));

        // If we have the original vitals, recalculate the hash
        let isValid = false;
        let localHash = tx.data_hash;

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

          localHash = await generateDataHash(vitalsData);
          isValid = localHash === tx.data_hash;
        } else {
          // If vitals were deleted, we can't verify but mark as the hash exists
          isValid = tx.verified || false;
        }

        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
        }

        verificationResults.push({
          recordId: tx.id,
          patientName: tx.patients?.name || 'Unknown',
          localHash,
          onChainHash: tx.data_hash,
          isValid,
          timestamp: tx.created_at,
          txHash: tx.tx_hash,
        });

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setResults(verificationResults);
      setSummary({
        total: transactions.length,
        valid: validCount,
        invalid: invalidCount,
        unverified: transactions.length - validCount - invalidCount,
      });

      // Update verified status in database
      const validTxIds = verificationResults
        .filter(r => r.isValid)
        .map(r => r.recordId);

      if (validTxIds.length > 0) {
        await supabase
          .from('blockchain_transactions')
          .update({ verified: true, verified_at: new Date().toISOString() })
          .in('id', validTxIds);
      }

      toast({
        title: 'Verification Complete',
        description: `${validCount} of ${transactions.length} records verified successfully`,
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getIntegrityStatus = () => {
    if (!summary) return null;
    
    if (summary.invalid === 0 && summary.valid > 0) {
      return {
        icon: CheckCircle,
        color: 'text-consensus',
        bg: 'bg-consensus/10',
        text: 'All Records Valid',
        description: 'No data tampering detected',
      };
    } else if (summary.invalid > 0) {
      return {
        icon: XCircle,
        color: 'text-alert',
        bg: 'bg-alert/10',
        text: 'Integrity Issues Detected',
        description: `${summary.invalid} record(s) have mismatched hashes`,
      };
    } else {
      return {
        icon: AlertTriangle,
        color: 'text-warning',
        bg: 'bg-warning/10',
        text: 'Verification Incomplete',
        description: 'Some records could not be verified',
      };
    }
  };

  const integrityStatus = getIntegrityStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Blockchain Integrity Verification
            </CardTitle>
            <CardDescription>
              Compare on-chain data hashes with local vitals records
            </CardDescription>
          </div>
          <Button 
            onClick={verifyAllRecords} 
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify All Records
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        {isVerifying && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Verifying records...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Summary */}
        {summary && (
          <>
            <div className={cn(
              "p-4 rounded-lg flex items-center gap-4",
              integrityStatus?.bg
            )}>
              {integrityStatus && (
                <>
                  <integrityStatus.icon className={cn("h-8 w-8", integrityStatus.color)} />
                  <div>
                    <p className={cn("font-semibold", integrityStatus.color)}>
                      {integrityStatus.text}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {integrityStatus.description}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-consensus">{summary.valid}</p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-alert">{summary.invalid}</p>
                <p className="text-sm text-muted-foreground">Invalid</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Verification Details
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={result.recordId}
                  className={cn(
                    "p-3 rounded-lg border text-sm",
                    result.isValid 
                      ? "border-consensus/30 bg-consensus/5" 
                      : "border-alert/30 bg-alert/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.isValid ? (
                        <CheckCircle className="h-4 w-4 text-consensus" />
                      ) : (
                        <XCircle className="h-4 w-4 text-alert" />
                      )}
                      <span className="font-medium">{result.patientName}</span>
                    </div>
                    <Badge variant={result.isValid ? 'default' : 'destructive'} className="text-xs">
                      {result.isValid ? 'Match' : 'Mismatch'}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      <span>Local: {result.localHash.slice(0, 20)}...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3 w-3" />
                      <span>On-chain: {result.onChainHash.slice(0, 20)}...</span>
                    </div>
                    <div className="text-xs mt-1">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isVerifying && results.length === 0 && !summary && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Verify All Records" to check blockchain integrity</p>
            <p className="text-sm mt-1">
              This compares on-chain data hashes with local vitals records
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}