import { useState } from 'react';
import { Copy, Check, ExternalLink, Clock, Hash, Fuel, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatHash } from '@/lib/ethereum';
import { toast } from 'sonner';

export interface EthereumBlockCardProps {
  block: {
    number: number;
    hash: string;
    parentHash: string;
    timestamp: string;
    miner: string;
    gasUsed: number;
    transactionCount: number;
  };
  isSelected?: boolean;
  onSelect?: () => void;
  isNew?: boolean;
}

export function EthereumBlockCard({ block, isSelected, onSelect, isNew }: EthereumBlockCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:border-primary ${isSelected ? 'border-primary bg-primary/5' : ''} ${isNew ? 'ring-2 ring-consensus animate-pulse' : ''}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Block #{block.number.toLocaleString()}</CardTitle>
          </div>
          <Badge variant="outline" className={isNew ? "text-consensus border-consensus bg-consensus/10" : "text-success border-success"}>
            {isNew ? 'New' : 'Finalized'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(block.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Fuel className="h-3 w-3" />
            <span>{block.gasUsed.toLocaleString()} gas</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Block Hash</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(block.hash, 'hash');
              }}
            >
              {copiedField === 'hash' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <div className="font-mono text-xs bg-muted p-2 rounded break-all">
            {formatHash(block.hash, 20)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Parent Hash</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(block.parentHash, 'parentHash');
              }}
            >
              {copiedField === 'parentHash' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <div className="font-mono text-xs bg-muted p-2 rounded break-all">
            {formatHash(block.parentHash, 20)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              <strong>{block.transactionCount}</strong> txns
            </span>
          </div>
          <a
            href={`https://sepolia.etherscan.io/block/${block.number}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline text-sm flex items-center gap-1"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
