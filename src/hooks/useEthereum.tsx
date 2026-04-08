import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  WalletState,
  NetworkInfo,
  BlockInfo,
  TransactionInfo,
  StoreVitalsResult,
  ReadingStatus,
  isMetaMaskInstalled,
  connectMetaMask,
  switchToSepolia,
  getWalletState,
  onAccountsChanged,
  onChainChanged,
  submitReadingOnChain,
  approveReadingOnChain,
  anchorBlockOnChain,
  getReadingFromChain,
  checkBlockAnchored,
  getContractAddress,
  hashPatientId,
  hashVitalsData,
  SEPOLIA_CHAIN_ID,
} from '@/lib/ethereum';
import { toast } from 'sonner';

interface UseEthereumReturn {
  wallet: WalletState;
  isConnecting: boolean;
  networkInfo: NetworkInfo | null;
  recentBlocks: BlockInfo[];
  selectedEthBlock: BlockInfo | null;
  transaction: TransactionInfo | null;
  isLoadingNetwork: boolean;
  isLoadingBlocks: boolean;
  isLoadingTransaction: boolean;
  isStoringVitals: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  refreshNetworkInfo: () => Promise<void>;
  refreshBlocks: () => Promise<void>;
  fetchBlockDetails: (blockNumber: number | 'latest') => Promise<void>;
  fetchTransaction: (txHash: string) => Promise<void>;
  getBlockDetails: (blockNumber: number | 'latest') => Promise<BlockInfo | null>;
  getTransaction: (txHash: string) => Promise<TransactionInfo | null>;
  simulateStoreRecord: (patientId: string, vitals: any) => Promise<any>;
  storeVitals: (patientId: string, vitals: any) => Promise<StoreVitalsResult>;
  approveReading: (readingId: number) => Promise<StoreVitalsResult>;
  anchorBlock: (blockHash: string) => Promise<StoreVitalsResult>;
  readReading: (readingId: number) => ReturnType<typeof getReadingFromChain>;
  checkAnchored: (blockHash: string) => Promise<boolean>;
  getContractSource: () => Promise<any>;
}

export function useEthereum(): UseEthereumReturn {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false, address: null, chainId: null, balance: null, isCorrectNetwork: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);
  const [selectedEthBlock, setSelectedEthBlock] = useState<BlockInfo | null>(null);
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [isLoadingTransaction, setIsLoadingTransaction] = useState(false);
  const [isStoringVitals, setIsStoringVitals] = useState(false);

  useEffect(() => {
    const initWallet = async () => { setWallet(await getWalletState()); };
    initWallet();
    const removeAccounts = onAccountsChanged(async (accounts) => {
      setWallet(accounts.length === 0
        ? { isConnected: false, address: null, chainId: null, balance: null, isCorrectNetwork: false }
        : await getWalletState());
    });
    const removeChain = onChainChanged(async () => {
      const state = await getWalletState();
      setWallet(state);
      if (!state.isCorrectNetwork && state.isConnected) toast.warning('Please switch to Sepolia testnet');
    });
    return () => { removeAccounts(); removeChain(); };
  }, []);

  useEffect(() => { refreshNetworkInfo(); fetchRecentBlocks(); }, []);

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed', {
        action: { label: 'Install', onClick: () => window.open('https://metamask.io/download/', '_blank') },
      });
      return;
    }
    setIsConnecting(true);
    try {
      const state = await connectMetaMask();
      setWallet(state);
      if (!state.isCorrectNetwork) {
        toast.warning('Wrong network', { action: { label: 'Switch', onClick: () => switchNetwork() } });
      } else {
        toast.success('Wallet connected', { description: `${state.address?.slice(0, 6)}...${state.address?.slice(-4)}` });
      }
    } catch (error: any) {
      toast.error('Connection failed', { description: error.message });
    } finally { setIsConnecting(false); }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ isConnected: false, address: null, chainId: null, balance: null, isCorrectNetwork: false });
    toast.info('Wallet disconnected');
  }, []);

  const switchNetwork = useCallback(async () => {
    try { await switchToSepolia(); setWallet(await getWalletState()); toast.success('Switched to Sepolia'); }
    catch (e: any) { toast.error('Switch failed', { description: e.message }); }
  }, []);

  const refreshNetworkInfo = useCallback(async () => {
    setIsLoadingNetwork(true);
    try {
      const res = await supabase.functions.invoke('blockchain', { body: { action: 'getNetworkInfo' } });
      if (res.data?.success) setNetworkInfo(res.data.data);
    } catch {} finally { setIsLoadingNetwork(false); }
  }, []);

  const fetchRecentBlocks = useCallback(async () => {
    setIsLoadingBlocks(true);
    try {
      const res = await supabase.functions.invoke('blockchain', { body: { action: 'getRecentBlocks' } });
      if (res.data?.success) setRecentBlocks(res.data.data);
    } catch {} finally { setIsLoadingBlocks(false); }
  }, []);

  const getBlockDetails = useCallback(async (blockNumber: number | 'latest'): Promise<BlockInfo | null> => {
    try {
      const res = await supabase.functions.invoke('blockchain', { body: { action: 'getBlockDetails', data: { blockNumber } } });
      return res.data?.success ? res.data.data : null;
    } catch { return null; }
  }, []);

  const fetchBlockDetails = useCallback(async (blockNumber: number | 'latest') => {
    const block = await getBlockDetails(blockNumber);
    if (block) setSelectedEthBlock(block);
  }, [getBlockDetails]);

  const refreshBlocks = useCallback(async () => { await fetchRecentBlocks(); }, [fetchRecentBlocks]);

  const getTransaction = useCallback(async (txHash: string): Promise<TransactionInfo | null> => {
    try {
      const res = await supabase.functions.invoke('blockchain', { body: { action: 'getTransaction', data: { txHash } } });
      return res.data?.success ? res.data.data : null;
    } catch { return null; }
  }, []);

  const fetchTransaction = useCallback(async (txHash: string) => {
    setIsLoadingTransaction(true); setTransaction(null);
    try { const tx = await getTransaction(txHash); if (tx) setTransaction(tx); }
    finally { setIsLoadingTransaction(false); }
  }, [getTransaction]);

  const simulateStoreRecord = useCallback(async (patientId: string, vitals: any) => {
    try {
      const res = await supabase.functions.invoke('blockchain', { body: { action: 'simulateStoreRecord', data: { patientId, vitals } } });
      return res.data?.data || null;
    } catch { return null; }
  }, []);

  const storeVitals = useCallback(async (patientId: string, vitals: any): Promise<StoreVitalsResult> => {
    if (!wallet.isConnected) return { success: false, error: 'Wallet not connected' };
    if (!wallet.isCorrectNetwork) return { success: false, error: 'Switch to Sepolia' };
    setIsStoringVitals(true);
    try {
      const result = await submitReadingOnChain(patientId, vitals);
      if (result.success) {
        toast.success('Reading submitted on-chain!', {
          description: `Reading #${result.readingId || ''} Block #${result.blockNumber}`,
          action: result.txHash ? { label: 'View', onClick: () => window.open(`https://sepolia.etherscan.io/tx/${result.txHash}`, '_blank') } : undefined,
        });
      } else {
        toast.error('Failed', { description: result.error });
      }
      return result;
    } catch (e: any) {
      toast.error('Transaction failed', { description: e.message });
      return { success: false, error: e.message };
    } finally { setIsStoringVitals(false); }
  }, [wallet]);

  const approveReading = useCallback(async (readingId: number) => {
    const result = await approveReadingOnChain(readingId);
    if (result.success) toast.success(`Reading #${readingId} approved`);
    else toast.error('Approval failed', { description: result.error });
    return result;
  }, []);

  const anchorBlock = useCallback(async (blockHash: string) => {
    const result = await anchorBlockOnChain(blockHash);
    if (result.success) toast.success('Block anchored on-chain');
    else toast.error('Anchor failed', { description: result.error });
    return result;
  }, []);

  const readReading = useCallback(async (readingId: number) => {
    return getReadingFromChain(readingId);
  }, []);

  const checkAnchored = useCallback(async (blockHash: string) => {
    return checkBlockAnchored(blockHash);
  }, []);

  const getContractSource = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke('blockchain', { body: { action: 'getContractSource' } });
      return res.data?.data || null;
    } catch { return null; }
  }, []);

  return {
    wallet, isConnecting, networkInfo, recentBlocks, selectedEthBlock, transaction,
    isLoadingNetwork, isLoadingBlocks, isLoadingTransaction, isStoringVitals,
    connect, disconnect, switchNetwork, refreshNetworkInfo, refreshBlocks,
    fetchBlockDetails, fetchTransaction, getBlockDetails, getTransaction,
    simulateStoreRecord, storeVitals, approveReading, anchorBlock, readReading, checkAnchored,
    getContractSource,
  };
}
