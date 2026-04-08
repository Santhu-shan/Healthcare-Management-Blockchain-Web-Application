import { BrowserProvider, parseEther, formatEther } from 'ethers';

// Admin wallet address for receiving payments - configurable
const ADMIN_WALLET_KEY = 'ADMIN_WALLET_ADDRESS';
export const getAdminWallet = (): string => {
  return localStorage.getItem(ADMIN_WALLET_KEY) || '';
};
export const setAdminWallet = (addr: string) => {
  localStorage.setItem(ADMIN_WALLET_KEY, addr);
};

// USD to ETH conversion (simplified - in production use an oracle)
const ETH_USD_RATE = 3500; // approximate
export const usdToEth = (usd: number): string => {
  return (usd / ETH_USD_RATE).toFixed(6);
};

export const ethToUsd = (eth: string): number => {
  return parseFloat(eth) * ETH_USD_RATE;
};

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
  blockNumber?: number;
  gasUsed?: string;
}

export async function sendEthPayment(toAddress: string, ethAmount: string): Promise<PaymentResult> {
  try {
    if (!window.ethereum) {
      return { success: false, error: 'MetaMask not installed' };
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parseEther(ethAmount),
    });

    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
    };
  } catch (err: any) {
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    return { success: false, error: err.message || 'Transaction failed' };
  }
}

export async function getWalletBalance(): Promise<string | null> {
  try {
    if (!window.ethereum) return null;
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const balance = await provider.getBalance(signer.address);
    return formatEther(balance);
  } catch {
    return null;
  }
}

export async function getCurrentWalletAddress(): Promise<string | null> {
  try {
    if (!window.ethereum) return null;
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return signer.address;
  } catch {
    return null;
  }
}
