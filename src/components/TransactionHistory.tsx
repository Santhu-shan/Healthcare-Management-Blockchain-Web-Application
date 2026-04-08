import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, XCircle, Clock, RefreshCw, Shield, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { formatHash, formatAddress } from '@/lib/ethereum';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BlockchainTransaction {
  id: string;
  patient_id: string;
  vital_id: string | null;
  tx_hash: string;
  block_number: number | null;
  from_address: string;
  gas_used: string | null;
  data_hash: string;
  vitals_summary: {
    hr?: number;
    spo2?: number;
    temp?: number;
    bp?: string | null;
    rr?: number | null;
    status?: string;
    timestamp?: string;
  };
  status: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  patients?: {
    name: string;
  };
}

interface TransactionHistoryProps {
  patientId?: string;
  limit?: number;
  onVerify?: (transaction: BlockchainTransaction) => Promise<boolean>;
}

export function TransactionHistory({ patientId, limit = 20, onVerify }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('blockchain_transactions')
        .select(`
          *,
          patients (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTransactions((data || []) as BlockchainTransaction[]);
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transaction history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [patientId, limit]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  const handleVerify = async (tx: BlockchainTransaction) => {
    if (!onVerify) return;
    
    setVerifying(tx.id);
    try {
      const isValid = await onVerify(tx);
      
      if (isValid) {
        // Update local state
        setTransactions(prev => 
          prev.map(t => 
            t.id === tx.id 
              ? { ...t, verified: true, verified_at: new Date().toISOString() }
              : t
          )
        );
        
        // Update in database
        await supabase
          .from('blockchain_transactions')
          .update({ verified: true, verified_at: new Date().toISOString() })
          .eq('id', tx.id);
        
        toast({
          title: 'Verification Successful',
          description: 'On-chain data matches local records',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Data mismatch detected - integrity issue',
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

  const getStatusBadge = (status: string, verified: boolean) => {
    if (verified) {
      return (
        <Badge variant="default" className="bg-consensus/20 text-consensus border-consensus/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-success/20 text-success border-success/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Blockchain Transaction History
            </CardTitle>
            <CardDescription>
              {patientId 
                ? 'Vitals records stored on Ethereum Sepolia'
                : 'All patient records on the blockchain'
              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadTransactions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No blockchain transactions found</p>
            <p className="text-sm mt-1">Store patient vitals to create on-chain records</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all hover:border-primary/50",
                    tx.verified && "border-consensus/30 bg-consensus/5"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(tx.status, tx.verified)}
                      {tx.patients?.name && (
                        <span className="text-sm font-medium">{tx.patients.name}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Transaction Hash</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {formatHash(tx.tx_hash)}
                        </code>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(tx.tx_hash, 'Transaction hash')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy hash</TooltipContent>
                        </Tooltip>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Block Number</p>
                      <p className="font-mono">
                        {tx.block_number ? `#${tx.block_number.toLocaleString()}` : 'Pending'}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">From Address</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {formatAddress(tx.from_address)}
                      </code>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Gas Used</p>
                      <p className="font-mono">{tx.gas_used || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Vitals Summary */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Stored Vitals</p>
                    <div className="flex flex-wrap gap-2">
                      {tx.vitals_summary.hr && (
                        <Badge variant="outline" className="text-xs">
                          HR: {tx.vitals_summary.hr} bpm
                        </Badge>
                      )}
                      {tx.vitals_summary.spo2 && (
                        <Badge variant="outline" className="text-xs">
                          SpO2: {tx.vitals_summary.spo2}%
                        </Badge>
                      )}
                      {tx.vitals_summary.temp && (
                        <Badge variant="outline" className="text-xs">
                          Temp: {tx.vitals_summary.temp}°C
                        </Badge>
                      )}
                      {tx.vitals_summary.bp && (
                        <Badge variant="outline" className="text-xs">
                          BP: {tx.vitals_summary.bp}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Verify Button */}
                  {onVerify && tx.status === 'success' && !tx.verified && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(tx)}
                        disabled={verifying === tx.id}
                        className="w-full"
                      >
                        {verifying === tx.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Verify On-Chain Integrity
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {tx.verified && tx.verified_at && (
                    <div className="mt-3 pt-3 border-t text-xs text-consensus">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Verified on {new Date(tx.verified_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}