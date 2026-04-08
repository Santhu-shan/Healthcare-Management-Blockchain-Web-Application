import { useState, useEffect, useRef } from 'react';
import {
  Boxes, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  Shield, 
  Zap, 
  Copy, 
  ExternalLink,
  Wallet,
  Search,
  Layers,
  Globe,
  Clock,
  Plus,
  Activity,
  History,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { BlockchainRecord, CONSENSUS_CONFIG } from '@/types';
import { verifyChainIntegrity } from '@/lib/blockchainSimulator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useEthereum } from '@/hooks/useEthereum';
import { useBlockchainWebSocket } from '@/hooks/useBlockchainWebSocket';
import { WalletConnect } from '@/components/WalletConnect';
import { EthereumBlockCard } from '@/components/EthereumBlockCard';
import { LiveBlockIndicator } from '@/components/LiveBlockIndicator';
import { StoreVitalsModal } from '@/components/StoreVitalsModal';
import { TransactionHistory } from '@/components/TransactionHistory';
import { BlockchainVerification } from '@/components/BlockchainVerification';
import { DeploymentGuide } from '@/components/DeploymentGuide';
import { ConsentLogTab } from '@/components/ConsentLogTab';
import BlockchainBlock from '@/components/BlockchainBlock';
import { formatHash, generateDataHash, getPatientRecordContract, PATIENT_RECORD_CONTRACT_ADDRESS } from '@/lib/ethereum';

export default function Blockchain() {
  const [blocks, setBlocks] = useState<BlockchainRecord[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockchainRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [chainValidation, setChainValidation] = useState<{ isValid: boolean }>({ isValid: true });
  const [txHash, setTxHash] = useState('');
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [txHistoryKey, setTxHistoryKey] = useState(0);
  const { toast } = useToast();

  const {
    wallet,
    networkInfo,
    recentBlocks,
    selectedEthBlock,
    transaction,
    isConnecting,
    isLoadingNetwork,
    isLoadingBlocks,
    isLoadingTransaction,
    connect,
    disconnect,
    switchNetwork,
    fetchBlockDetails,
    fetchTransaction,
    refreshBlocks,
    storeVitals,
  } = useEthereum();

  const {
    isConnected: isLiveConnected,
    latestBlock: liveLatestBlock,
    liveBlocks,
    blocksPerMinute,
    connect: connectLive,
    disconnect: disconnectLive,
  } = useBlockchainWebSocket();

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    const { data } = await supabase.from('blockchain_records').select('*').order('block_number', { ascending: false }).limit(50);
    const typedBlocks = (data || []) as BlockchainRecord[];
    setBlocks(typedBlocks);
    const validation = verifyChainIntegrity(typedBlocks);
    setChainValidation({ isValid: validation.isValid });
    setLoading(false);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: 'Copied!', description: 'Hash copied to clipboard' });
  };

  const handleSearchTransaction = () => {
    if (txHash.trim()) {
      fetchTransaction(txHash.trim());
    }
  };

  const handleStoreVitals = async (patientId: string, vitals: any) => {
    return await storeVitals(patientId, vitals);
  };

  const handleTransactionComplete = () => {
    // Trigger transaction history refresh
    setTxHistoryKey(prev => prev + 1);
  };

  const handleVerifyTransaction = async (tx: any): Promise<boolean> => {
    try {
      // Recalculate local hash from original vitals
      const { data: vitalRecord } = await supabase
        .from('vitals')
        .select('*')
        .eq('id', tx.vital_id)
        .single();

      if (!vitalRecord) {
        // Vitals deleted, can't verify
        return false;
      }

      const localHash = await generateDataHash({
        heart_rate: vitalRecord.heart_rate,
        spo2: vitalRecord.spo2,
        temperature: vitalRecord.temperature,
        blood_pressure_systolic: vitalRecord.blood_pressure_systolic,
        blood_pressure_diastolic: vitalRecord.blood_pressure_diastolic,
        respiratory_rate: vitalRecord.respiratory_rate,
        recorded_at: vitalRecord.recorded_at,
        status: vitalRecord.status,
      });

      // Compare with stored hash
      return localHash === tx.data_hash;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  };

  // Merge live blocks with fetched blocks
  const displayBlocks = isLiveConnected && liveBlocks.length > 0 ? liveBlocks : recentBlocks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Blockchain Explorer</h1>
          <p className="text-muted-foreground mt-1">Real-time Ethereum Sepolia testnet & patient record chain</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LiveBlockIndicator
            isConnected={isLiveConnected}
            latestBlock={liveLatestBlock}
            blocksPerMinute={blocksPerMinute}
            onConnect={connectLive}
            onDisconnect={disconnectLive}
          />
          <WalletConnect
            wallet={wallet}
            isConnecting={isConnecting}
            onConnect={connect}
            onDisconnect={disconnect}
            onSwitchNetwork={switchNetwork}
          />
          <Button variant="outline" onClick={refreshBlocks} disabled={isLoadingBlocks}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingBlocks && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setStoreModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Store Vitals
          </Button>
        </div>
      </div>

      {/* Store Vitals Modal */}
      <StoreVitalsModal
        open={storeModalOpen}
        onOpenChange={setStoreModalOpen}
        walletConnected={wallet.isConnected}
        walletAddress={wallet.address}
        onStoreVitals={handleStoreVitals}
        onTransactionComplete={handleTransactionComplete}
      />

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Network</p>
              {isLoadingNetwork ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-xl font-bold">{networkInfo?.networkName || 'Sepolia'}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-consensus/20 flex items-center justify-center">
              <Layers className="h-6 w-6 text-consensus" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Latest Block</p>
              {isLoadingNetwork ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <p className="text-xl font-bold">#{networkInfo?.blockNumber?.toLocaleString() || '...'}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-block/20 flex items-center justify-center">
              <Zap className="h-6 w-6 text-block" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gas Price</p>
              {isLoadingNetwork ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-xl font-bold">{networkInfo?.gasPrice || '...'} Gwei</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              wallet.isConnected ? "bg-success/20" : "bg-muted"
            )}>
              <Wallet className={cn(
                "h-6 w-6",
                wallet.isConnected ? "text-success" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet</p>
              <p className="text-xl font-bold">
                {wallet.isConnected ? (
                  <span className="text-success">Connected</span>
                ) : (
                  <span className="text-muted-foreground">Not Connected</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sepolia" className="space-y-4">
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
          <TabsTrigger value="sepolia">Sepolia Blocks</TabsTrigger>
          <TabsTrigger value="patient">Patient Chain</TabsTrigger>
          <TabsTrigger value="lookup">Tx Lookup</TabsTrigger>
          <TabsTrigger value="history">Tx History</TabsTrigger>
          <TabsTrigger value="verify">Verification</TabsTrigger>
          <TabsTrigger value="consents">Consent Log</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
        </TabsList>

        {/* Sepolia Testnet Blocks */}
        <TabsContent value="sepolia" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Boxes className="h-5 w-5" />
                    Recent Sepolia Blocks
                    {isLiveConnected && (
                      <Badge variant="outline" className="ml-2 bg-consensus/10 text-consensus border-consensus/20">
                        <Activity className="h-3 w-3 mr-1 animate-pulse" />
                        Live
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isLiveConnected 
                      ? 'Real-time blocks from the Ethereum Sepolia testnet'
                      : 'Live blocks from the Ethereum Sepolia testnet'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBlocks && !isLiveConnected ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : displayBlocks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {displayBlocks.map((block, index) => (
                    <EthereumBlockCard
                      key={block.number}
                      block={block}
                      isSelected={selectedEthBlock?.number === block.number}
                      onSelect={() => fetchBlockDetails(block.number)}
                      isNew={isLiveConnected && index === 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No blocks loaded yet. Click refresh to fetch blocks.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Block Details */}
          {selectedEthBlock && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Block #{selectedEthBlock.number.toLocaleString()} Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Block Hash</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {formatHash(selectedEthBlock.hash)}
                        </code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyHash(selectedEthBlock.hash)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <a
                          href={`https://sepolia.etherscan.io/block/${selectedEthBlock.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parent Hash</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {formatHash(selectedEthBlock.parentHash)}
                      </code>
                    </div>
                    <div>
                    <p className="text-sm text-muted-foreground">Miner</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {formatHash(selectedEthBlock.miner)}
                      </code>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Timestamp</p>
                      <p className="font-mono">{new Date(selectedEthBlock.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transactions</p>
                      <Badge variant="secondary">{selectedEthBlock.transactionCount} txns</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gas Used</p>
                      <p className="font-mono">{selectedEthBlock.gasUsed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gas Limit</p>
                      <p className="font-mono">{selectedEthBlock.gasLimit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Patient Record Chain */}
        <TabsContent value="patient" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-consensus/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-consensus" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chain Status</p>
                  <p className={cn("text-xl font-bold", chainValidation.isValid ? "text-consensus" : "text-alert")}>
                    {chainValidation.isValid ? 'Valid & Secure' : 'Integrity Issue'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Blocks</p>
                  <p className="text-xl font-bold">{blocks.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-block/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-block" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trusted Nodes</p>
                  <p className="text-xl font-bold">{CONSENSUS_CONFIG.trusted_nodes.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Validation</p>
                  <p className="text-xl font-bold">{CONSENSUS_CONFIG.target_validation_time_ms}ms</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Patient Record Blockchain
              </CardTitle>
              <CardDescription>
                Immutable medical record chain with hybrid consensus validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : blocks.length > 0 ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {blocks.map((block, i) => (
                      <div 
                        key={block.id} 
                        onClick={() => setSelectedBlock(block)}
                        className={cn(
                          "cursor-pointer transition-all",
                          selectedBlock?.id === block.id && "ring-2 ring-primary rounded-lg"
                        )}
                      >
                        <BlockchainBlock block={block} isFirst={i === 0} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No patient records in the blockchain yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Lookup */}
        <TabsContent value="lookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Transaction Lookup
              </CardTitle>
              <CardDescription>
                Search for any transaction on the Sepolia testnet by hash
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Enter transaction hash (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={handleSearchTransaction} disabled={isLoadingTransaction || !txHash.trim()}>
                  {isLoadingTransaction ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {transaction && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Transaction Details</h3>
                    <Badge variant={transaction.status === 'success' ? 'default' : 'destructive'}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Hash</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {formatHash(transaction.hash)}
                        </code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyHash(transaction.hash)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Block</p>
                      <p className="font-mono">#{transaction.blockNumber?.toLocaleString() || 'Pending'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">From</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {formatHash(transaction.from)}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">To</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {transaction.to ? formatHash(transaction.to) : 'Contract Creation'}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Value</p>
                      <p className="font-mono">{transaction.value} ETH</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gas Used</p>
                      <p className="font-mono">{transaction.gasUsed?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transaction.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                    >
                      View on Etherscan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {!transaction && !isLoadingTransaction && (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter a transaction hash to look up details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History */}
        <TabsContent value="history" className="space-y-4">
          <TransactionHistory
            key={txHistoryKey}
            onVerify={handleVerifyTransaction}
          />
        </TabsContent>

        {/* Blockchain Verification */}
        <TabsContent value="verify" className="space-y-4">
          <BlockchainVerification />
        </TabsContent>

        {/* Consent Log */}
        <TabsContent value="consents" className="space-y-4">
          <ConsentLogTab />
        </TabsContent>

        {/* Deployment Guide */}
        <TabsContent value="deploy" className="space-y-4">
          <DeploymentGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}
