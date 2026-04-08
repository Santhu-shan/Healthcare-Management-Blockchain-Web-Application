import { BrowserProvider, Contract, formatEther, keccak256, toUtf8Bytes, AbiCoder, JsonRpcProvider } from 'ethers';

// Sepolia testnet configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
export const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/';

// Contract address – update after deploying HybridPatientMonitor.sol via Remix
// Users set this in Settings page; stored in localStorage
export const getContractAddress = (): string => {
  return localStorage.getItem('HYBRID_CONTRACT_ADDRESS') || '0x0000000000000000000000000000000000000000';
};
export const setContractAddress = (addr: string) => {
  localStorage.setItem('HYBRID_CONTRACT_ADDRESS', addr);
};

export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Sepolia Testnet',
  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
};

// ═══════════════════════════════════════════════════════════════════════════
// HybridPatientMonitor ABI (matches public/contracts/HybridPatientMonitor.sol)
// ═══════════════════════════════════════════════════════════════════════════

export const HYBRID_CONTRACT_ABI = [
  // ── Role Management ──
  'function grantRole(address account, uint8 role) external',
  'function revokeRole(address account) external',
  'function roles(address) view returns (uint8)',
  'function getValidatorCount() view returns (uint256)',
  'function owner() view returns (address)',
  'function approvalThreshold() view returns (uint256)',

  // ── Readings ──
  'function submitReading(bytes32 patientIdHash, bytes32 vitalsHash, string summaryCID) external returns (uint256)',
  'function approveReading(uint256 readingId) external',
  'function rejectReading(uint256 readingId) external',
  'function readingCount() view returns (uint256)',
  'function getReading(uint256 readingId) view returns (bytes32 patientIdHash, bytes32 vitalsHash, uint256 timestamp, string summaryCID, address submitter, uint8 status, uint256 approvalCnt)',
  'function getPatientReadingCount(bytes32 patientIdHash) view returns (uint256)',
  'function getPatientReadings(bytes32 patientIdHash, uint256 offset, uint256 limit) view returns (uint256[])',

  // ── Anchoring ──
  'function anchorInternalBlock(bytes32 blockHash) external returns (uint256)',
  'function isBlockAnchored(bytes32 blockHash) view returns (bool)',
  'function anchorCount() view returns (uint256)',
  'function getAnchor(uint256 anchorId) view returns (bytes32, uint256, address)',

  // ── Consent ──
  'function updateConsent(bytes32 patientIdHash, address doctor, bool granted) external',

  // ── Admin ──
  'function setApprovalThreshold(uint256 newThreshold) external',

  // ── Events ──
  'event ReadingSubmitted(uint256 indexed readingId, bytes32 indexed patientIdHash, bytes32 vitalsHash, uint256 timestamp, address submitter)',
  'event ReadingApproved(uint256 indexed readingId, address indexed validator, uint256 approvalCount)',
  'event ReadingFinalized(uint256 indexed readingId, bytes32 patientIdHash, uint256 timestamp)',
  'event ReadingRejected(uint256 indexed readingId)',
  'event BlockAnchored(uint256 indexed anchorId, bytes32 blockHash, uint256 timestamp, address anchoredBy)',
  'event ConsentUpdated(bytes32 indexed patientIdHash, address indexed doctor, bool granted, uint256 timestamp)',
  'event RoleGranted(address indexed account, uint8 role)',
  'event RoleRevoked(address indexed account)',
];

// Keep legacy ABI for backward compat (old PatientRecordStorage)
export const PATIENT_RECORD_ABI = HYBRID_CONTRACT_ABI;
export const PATIENT_RECORD_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

declare global {
  interface Window { ethereum?: any; }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isCorrectNetwork: boolean;
}

export interface NetworkInfo {
  chainId: number;
  networkName: string;
  blockNumber: number;
  gasPrice: number;
}

export interface BlockInfo {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: string;
  miner: string;
  gasUsed: number;
  gasLimit: number;
  transactionCount: number;
  size: number;
  nonce: string;
  stateRoot: string;
  receiptsRoot: string;
  transactionsRoot: string;
}

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string;
  value: number;
  gasPrice: number;
  gas: number;
  nonce: number;
  input: string;
  status: string;
  gasUsed: number | null;
  logs: number;
}

export interface StoreVitalsResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  blockNumber?: number;
  readingId?: number;
}

export enum ContractRole {
  NONE = 0,
  ADMIN = 1,
  DOCTOR = 2,
  DEVICE = 3,
  VALIDATOR = 4,
}

export enum ReadingStatus {
  Pending = 0,
  Finalized = 1,
  Rejected = 2,
}

// ═══════════════════════════════════════════════════════════════════════════
// HASHING — uses keccak256 consistently (same as Solidity)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hash a patient UUID to bytes32 (matches Solidity keccak256(abi.encodePacked(uuid)))
 */
export const hashPatientId = (patientUuid: string): string => {
  return keccak256(toUtf8Bytes(patientUuid));
};

/**
 * Hash vitals data to bytes32 using keccak256 of canonical JSON
 */
export const hashVitalsData = (vitals: Record<string, any>): string => {
  // Canonical: sorted keys JSON
  const canonical = JSON.stringify(vitals, Object.keys(vitals).sort());
  return keccak256(toUtf8Bytes(canonical));
};

/**
 * Legacy generateDataHash (SHA-256 via SubtleCrypto) – kept for backward compat
 */
export const generateDataHash = async (data: any): Promise<string> => {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ═══════════════════════════════════════════════════════════════════════════
// METAMASK HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export const isMetaMaskInstalled = (): boolean =>
  typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

export const connectMetaMask = async (): Promise<WalletState> => {
  if (!isMetaMaskInstalled()) throw new Error('MetaMask is not installed.');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
  const provider = new BrowserProvider(window.ethereum);
  const balance = await provider.getBalance(accounts[0]);
  return {
    isConnected: true,
    address: accounts[0],
    chainId,
    balance: formatEther(balance),
    isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
  };
};

export const switchToSepolia = async (): Promise<void> => {
  if (!isMetaMaskInstalled()) throw new Error('MetaMask is not installed');
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }] });
  } catch (error: any) {
    if (error.code === 4902) {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [SEPOLIA_NETWORK] });
    } else throw error;
  }
};

export const getWalletState = async (): Promise<WalletState> => {
  if (!isMetaMaskInstalled()) return { isConnected: false, address: null, chainId: null, balance: null, isCorrectNetwork: false };
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length === 0) return { isConnected: false, address: null, chainId: null, balance: null, isCorrectNetwork: false };
    const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
    const provider = new BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(accounts[0]);
    return { isConnected: true, address: accounts[0], chainId, balance: formatEther(balance), isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID };
  } catch {
    return { isConnected: false, address: null, chainId: null, balance: null, isCorrectNetwork: false };
  }
};

export const signMessage = async (message: string): Promise<string> => {
  if (!isMetaMaskInstalled()) throw new Error('MetaMask is not installed');
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatHash = (hash: string, length: number = 10): string => {
  if (!hash) return '';
  if (hash.length <= length * 2) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
};

export const onAccountsChanged = (callback: (accounts: string[]) => void): (() => void) => {
  if (!isMetaMaskInstalled()) return () => {};
  window.ethereum.on('accountsChanged', callback);
  return () => window.ethereum.removeListener('accountsChanged', callback);
};

export const onChainChanged = (callback: (chainId: string) => void): (() => void) => {
  if (!isMetaMaskInstalled()) return () => {};
  window.ethereum.on('chainChanged', callback);
  return () => window.ethereum.removeListener('chainChanged', callback);
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT INTERACTIONS – HybridPatientMonitor
// ═══════════════════════════════════════════════════════════════════════════

function getContract(signerOrProvider: any): Contract {
  const addr = getContractAddress();
  if (addr === '0x0000000000000000000000000000000000000000') {
    throw new Error('Contract not deployed. Set address in Settings.');
  }
  return new Contract(addr, HYBRID_CONTRACT_ABI, signerOrProvider);
}

async function getSigner() {
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

async function getProvider() {
  return new BrowserProvider(window.ethereum);
}

/**
 * Submit a vital-sign reading on-chain (Layer A – PoA)
 */
export const submitReadingOnChain = async (
  patientId: string,
  vitals: Record<string, any>,
  summaryCID: string = ''
): Promise<StoreVitalsResult> => {
  if (!isMetaMaskInstalled()) return { success: false, error: 'MetaMask not installed' };
  try {
    const signer = await getSigner();
    const contract = getContract(signer);
    const patientIdHash = hashPatientId(patientId);
    const vitalsHash = hashVitalsData(vitals);
    const summary = summaryCID || JSON.stringify({
      hr: vitals.heart_rate,
      spo2: vitals.spo2,
      temp: vitals.temperature,
      status: vitals.status,
    });

    const tx = await contract.submitReading(patientIdHash, vitalsHash, summary);
    const receipt = await tx.wait();

    // Parse readingId from event
    let readingId: number | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === 'ReadingSubmitted') {
          readingId = Number(parsed.args[0]);
        }
      } catch { /* skip non-matching logs */ }
    }

    return {
      success: true,
      txHash: tx.hash,
      gasUsed: receipt.gasUsed?.toString(),
      blockNumber: receipt.blockNumber,
      readingId,
    };
  } catch (error: any) {
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') return { success: false, error: 'Transaction rejected by user' };
    if (error.message?.includes('insufficient funds')) return { success: false, error: 'Insufficient ETH for gas fees.' };
    return { success: false, error: error.reason || error.message || 'Transaction failed' };
  }
};

/**
 * Approve a reading (Layer B – PBFT validator)
 */
export const approveReadingOnChain = async (readingId: number): Promise<StoreVitalsResult> => {
  if (!isMetaMaskInstalled()) return { success: false, error: 'MetaMask not installed' };
  try {
    const signer = await getSigner();
    const contract = getContract(signer);
    const tx = await contract.approveReading(readingId);
    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, gasUsed: receipt.gasUsed?.toString(), blockNumber: receipt.blockNumber };
  } catch (error: any) {
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') return { success: false, error: 'Rejected by user' };
    return { success: false, error: error.reason || error.message || 'Approval failed' };
  }
};

/**
 * Anchor internal DB block hash on-chain
 */
export const anchorBlockOnChain = async (blockHash: string): Promise<StoreVitalsResult> => {
  if (!isMetaMaskInstalled()) return { success: false, error: 'MetaMask not installed' };
  try {
    const signer = await getSigner();
    const contract = getContract(signer);
    const tx = await contract.anchorInternalBlock(blockHash);
    const receipt = await tx.wait();
    return { success: true, txHash: tx.hash, gasUsed: receipt.gasUsed?.toString(), blockNumber: receipt.blockNumber };
  } catch (error: any) {
    return { success: false, error: error.reason || error.message || 'Anchor failed' };
  }
};

/**
 * Read a reading from the contract (view call, no gas)
 */
export const getReadingFromChain = async (readingId: number) => {
  try {
    const provider = await getProvider();
    const contract = getContract(provider);
    const result = await contract.getReading(readingId);
    return {
      patientIdHash: result[0],
      vitalsHash: result[1],
      timestamp: Number(result[2]),
      summaryCID: result[3],
      submitter: result[4],
      status: Number(result[5]) as ReadingStatus,
      approvalCount: Number(result[6]),
    };
  } catch (error: any) {
    return null;
  }
};

/**
 * Check if an internal block hash is anchored on-chain
 */
export const checkBlockAnchored = async (blockHash: string): Promise<boolean> => {
  try {
    const provider = await getProvider();
    const contract = getContract(provider);
    return await contract.isBlockAnchored(blockHash);
  } catch {
    return false;
  }
};

/**
 * Legacy storeVitalsOnChain – now wraps submitReadingOnChain for backward compat
 */
export const storeVitalsOnChain = async (
  patientId: string,
  vitals: any,
  _contractAddress?: string
): Promise<StoreVitalsResult> => {
  return submitReadingOnChain(patientId, vitals);
};

export const getPatientRecordContract = (contractAddress: string) => {
  if (!isMetaMaskInstalled()) throw new Error('MetaMask is not installed');
  const provider = new BrowserProvider(window.ethereum);
  return new Contract(contractAddress, HYBRID_CONTRACT_ABI, provider);
};
