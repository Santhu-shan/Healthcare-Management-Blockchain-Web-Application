import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Radio, Wifi, WifiOff } from 'lucide-react';
import { BlockInfo, formatHash } from '@/lib/ethereum';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface LiveBlockIndicatorProps {
  isConnected: boolean;
  latestBlock: BlockInfo | null;
  blocksPerMinute: number;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function LiveBlockIndicator({
  isConnected,
  latestBlock,
  blocksPerMinute,
  onConnect,
  onDisconnect,
}: LiveBlockIndicatorProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (latestBlock) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [latestBlock?.number]);

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className={cn(
              "relative h-3 w-3 rounded-full",
              isConnected ? "bg-consensus" : "bg-muted-foreground"
            )}>
              {isConnected && (
                <span className={cn(
                  "absolute inset-0 rounded-full bg-consensus",
                  pulse ? "animate-ping opacity-75" : "opacity-0"
                )} />
              )}
            </div>
            <span className="text-sm font-medium">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? 'Connected to Sepolia network' : 'Click to start live monitoring'}</p>
        </TooltipContent>
      </Tooltip>

      {isConnected && latestBlock && (
        <>
          <Badge variant="outline" className="font-mono text-xs">
            #{latestBlock.number.toLocaleString()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ~{blocksPerMinute} blocks/min
          </span>
        </>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={isConnected ? onDisconnect : onConnect}
        className="h-8 px-2"
      >
        {isConnected ? (
          <>
            <WifiOff className="h-4 w-4 mr-1" />
            Stop
          </>
        ) : (
          <>
            <Radio className="h-4 w-4 mr-1" />
            Go Live
          </>
        )}
      </Button>
    </div>
  );
}
