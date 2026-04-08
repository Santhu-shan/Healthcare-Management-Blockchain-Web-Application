import { Wallet, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatAddress, SEPOLIA_CHAIN_ID } from '@/lib/ethereum';
import { WalletState } from '@/lib/ethereum';

interface WalletConnectProps {
  wallet: WalletState;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
}

export function WalletConnect({
  wallet,
  isConnecting,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}: WalletConnectProps) {
  if (!wallet.isConnected) {
    return (
      <Button onClick={onConnect} disabled={isConnecting} variant="outline" size="sm">
        <Wallet className="h-4 w-4 mr-2" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <div className={`w-2 h-2 rounded-full ${wallet.isCorrectNetwork ? 'bg-success' : 'bg-warning'}`} />
          <Wallet className="h-4 w-4" />
          {formatAddress(wallet.address || '')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Address</span>
            <span className="font-mono text-xs">{formatAddress(wallet.address || '')}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-mono">{parseFloat(wallet.balance || '0').toFixed(4)} ETH</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Network</span>
            <Badge variant={wallet.isCorrectNetwork ? 'default' : 'secondary'} className="text-xs">
              {wallet.chainId === SEPOLIA_CHAIN_ID ? 'Sepolia' : `Chain ${wallet.chainId}`}
            </Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        {!wallet.isCorrectNetwork && (
          <DropdownMenuItem onClick={onSwitchNetwork}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Switch to Sepolia
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <a
            href={`https://sepolia.etherscan.io/address/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Etherscan
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onDisconnect} className="text-destructive">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
