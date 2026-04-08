import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Loader2, Heart, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getReadingFromChain, checkBlockAnchored, ReadingStatus, getContractAddress } from '@/lib/ethereum';

type VerifyStatus = 'loading' | 'verified' | 'tampered' | 'not-found' | 'not-finalized' | 'db-only';

interface VerificationResult {
  status: VerifyStatus;
  // On-chain data
  onChainStatus?: string;
  onChainVitalsHash?: string;
  onChainTimestamp?: number;
  onChainSubmitter?: string;
  onChainApprovals?: number;
  readingId?: number;
  // DB data
  patientName?: string;
  blockNumber?: number;
  dbHash?: string;
  consensusStatus?: string;
  vitalsSummary?: any;
  timestamp?: string;
  txHash?: string;
  // Anchor check
  isAnchored?: boolean;
}

export default function Verify() {
  const [params] = useSearchParams();
  const patientHash = params.get('ph');      // keccak256 of patient UUID (privacy-safe)
  const readingIdParam = params.get('rid');   // on-chain reading ID
  const dbHash = params.get('hash');          // internal blockchain_records hash
  // Legacy support
  const legacyPatientId = params.get('patient');

  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => { verify(); }, [patientHash, readingIdParam, dbHash, legacyPatientId]);

  const verify = async () => {
    setResult({ status: 'loading' });

    const readingId = readingIdParam ? parseInt(readingIdParam) : null;
    const contractAddr = getContractAddress();
    const hasContract = contractAddr !== '0x0000000000000000000000000000000000000000';

    // ─── PATH 1: On-chain verification via readingId ───
    if (readingId && hasContract) {
      try {
        const reading = await getReadingFromChain(readingId);
        if (!reading) {
          setResult({ status: 'not-found', readingId });
          return;
        }

        const statusLabels: Record<number, string> = {
          [ReadingStatus.Pending]: 'Pending',
          [ReadingStatus.Finalized]: 'Finalized',
          [ReadingStatus.Rejected]: 'Rejected',
        };

        // Also check if the DB hash is anchored on-chain
        let isAnchored = false;
        if (dbHash) {
          isAnchored = await checkBlockAnchored(dbHash);
        }

        const isFinalized = reading.status === ReadingStatus.Finalized;

        // Try to find matching DB record for richer display
        let dbData: any = null;
        if (legacyPatientId || patientHash) {
          const query = legacyPatientId
            ? supabase.from('blockchain_records').select('*, patients(name)').eq('patient_id', legacyPatientId).order('block_number', { ascending: false }).limit(1)
            : supabase.from('blockchain_records').select('*, patients(name)').order('block_number', { ascending: false }).limit(1);
          const { data } = await query;
          dbData = data?.[0];
        }

        setResult({
          status: isFinalized ? 'verified' : 'not-finalized',
          onChainStatus: statusLabels[reading.status] || 'Unknown',
          onChainVitalsHash: reading.vitalsHash,
          onChainTimestamp: reading.timestamp,
          onChainSubmitter: reading.submitter,
          onChainApprovals: reading.approvalCount,
          readingId,
          patientName: dbData?.patients?.name,
          blockNumber: dbData?.block_number,
          dbHash: dbData?.current_hash || dbHash || undefined,
          consensusStatus: dbData?.consensus_status,
          vitalsSummary: dbData?.data_summary,
          timestamp: dbData?.created_at,
          isAnchored,
        });
        return;
      } catch (err) {
        console.error('On-chain verification failed, falling back to DB:', err);
      }
    }

    // ─── PATH 2: DB-only verification (legacy or no contract) ───
    try {
      const patientId = legacyPatientId;
      if (!patientId && !dbHash) {
        setResult({ status: 'not-found' });
        return;
      }

      let query = dbHash
        ? supabase.from('blockchain_records').select('*').eq('current_hash', dbHash).limit(1)
        : supabase.from('blockchain_records').select('*').eq('patient_id', patientId!).order('block_number', { ascending: false }).limit(1);

      const { data: records } = await query;
      const record = records?.[0];
      if (!record) { setResult({ status: 'not-found' }); return; }

      const { data: patient } = await supabase.from('patients').select('name').eq('id', record.patient_id).single();
      const { data: txData } = await supabase.from('blockchain_transactions').select('tx_hash').eq('patient_id', record.patient_id).order('created_at', { ascending: false }).limit(1);

      // Check anchor if contract is available
      let isAnchored = false;
      if (hasContract && record.current_hash) {
        try { isAnchored = await checkBlockAnchored(record.current_hash); } catch {}
      }

      setResult({
        status: record.consensus_status === 'validated' ? 'db-only' : 'not-finalized',
        patientName: patient?.name || 'Unknown',
        blockNumber: record.block_number,
        dbHash: record.current_hash,
        consensusStatus: record.consensus_status,
        vitalsSummary: record.data_summary,
        timestamp: record.created_at,
        txHash: txData?.[0]?.tx_hash,
        isAnchored,
      });
    } catch {
      setResult({ status: 'not-found' });
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; desc: string }> = {
    verified: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'Verified On-Chain ✓', desc: 'This reading is finalized on-chain with PBFT consensus' },
    'db-only': { icon: Shield, color: 'text-primary', bg: 'bg-primary/10 border-primary/30', label: 'DB Ledger Verified', desc: 'Verified in internal ledger; not yet anchored on-chain' },
    tampered: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', label: 'Tamper Detected', desc: 'Hash mismatch — data integrity compromised' },
    'not-found': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', label: 'Record Not Found', desc: 'No record matches the provided parameters' },
    'not-finalized': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: 'Not Yet Finalized', desc: 'Reading exists but has not reached PBFT consensus threshold' },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><Heart className="h-10 w-10 text-primary" /></div>
          <h1 className="text-2xl font-bold font-display">IPMS Blockchain Verification</h1>
          <p className="text-muted-foreground text-sm">Verify medical records against on-chain data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Verification Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result || result.status === 'loading' ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying against blockchain...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Banner */}
                {(() => {
                  const cfg = statusConfig[result.status];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <div className={`flex flex-col items-center gap-3 py-4 rounded-lg border ${cfg.bg}`}>
                      <Icon className={`h-12 w-12 ${cfg.color}`} />
                      <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-xs text-muted-foreground text-center px-4">{cfg.desc}</p>
                    </div>
                  );
                })()}

                {/* Details Grid */}
                <div className="grid gap-3 text-sm">
                  {result.patientName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient</span>
                      <span className="font-medium">{result.patientName}</span>
                    </div>
                  )}
                  {result.readingId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">On-Chain Reading ID</span>
                      <span className="font-mono font-medium">#{result.readingId}</span>
                    </div>
                  )}
                  {result.onChainStatus && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">On-Chain Status</span>
                      <Badge variant="outline" className={
                        result.onChainStatus === 'Finalized' ? 'border-success text-success' :
                        result.onChainStatus === 'Pending' ? 'border-warning text-warning' : ''
                      }>{result.onChainStatus}</Badge>
                    </div>
                  )}
                  {result.onChainApprovals !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validator Approvals</span>
                      <span className="font-mono">{result.onChainApprovals}</span>
                    </div>
                  )}
                  {result.onChainSubmitter && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitter</span>
                      <span className="font-mono text-xs">{result.onChainSubmitter.slice(0, 8)}...{result.onChainSubmitter.slice(-6)}</span>
                    </div>
                  )}
                  {result.blockNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DB Block #</span>
                      <span className="font-mono font-medium">{result.blockNumber}</span>
                    </div>
                  )}
                  {result.consensusStatus && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DB Consensus</span>
                      <Badge variant="outline">{result.consensusStatus}</Badge>
                    </div>
                  )}
                  {result.isAnchored !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anchored On-Chain</span>
                      <Badge variant={result.isAnchored ? 'default' : 'outline'}>
                        {result.isAnchored ? '✓ Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                  {result.timestamp && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="text-xs">{new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                  {result.dbHash && (
                    <div>
                      <p className="text-muted-foreground mb-1">Block Hash</p>
                      <code className="text-xs bg-muted p-2 rounded block font-mono break-all">{result.dbHash}</code>
                    </div>
                  )}
                  {result.onChainVitalsHash && (
                    <div>
                      <p className="text-muted-foreground mb-1">On-Chain Vitals Hash</p>
                      <code className="text-xs bg-muted p-2 rounded block font-mono break-all">{result.onChainVitalsHash}</code>
                    </div>
                  )}
                  {result.vitalsSummary && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Vitals Summary</p>
                      <div className="flex gap-4 text-xs">
                        <span>HR: {result.vitalsSummary.heart_rate}</span>
                        <span>T: {result.vitalsSummary.temperature}°C</span>
                        <span>SpO₂: {result.vitalsSummary.spo2}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {result.txHash && (
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> View on Etherscan
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Hybrid Consensus: PoA submission + PBFT validator finality
        </p>
      </div>
    </div>
  );
}
