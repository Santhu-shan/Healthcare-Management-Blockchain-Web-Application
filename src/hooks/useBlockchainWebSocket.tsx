import { useState, useEffect, useCallback, useRef } from 'react';
import { BlockInfo } from '@/lib/ethereum';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseBlockchainWebSocketReturn {
  isConnected: boolean;
  latestBlock: BlockInfo | null;
  liveBlocks: BlockInfo[];
  blocksPerMinute: number;
  connect: () => void;
  disconnect: () => void;
}

export function useBlockchainWebSocket(): UseBlockchainWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [latestBlock, setLatestBlock] = useState<BlockInfo | null>(null);
  const [liveBlocks, setLiveBlocks] = useState<BlockInfo[]>([]);
  const [blocksPerMinute, setBlocksPerMinute] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const blockTimestampsRef = useRef<number[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLatestBlock = useCallback(async () => {
    try {
      const response = await supabase.functions.invoke('blockchain', {
        body: { action: 'getBlockDetails', data: { blockNumber: 'latest' } },
      });

      if (response.data?.success && response.data.data) {
        const block = response.data.data;
        
        setLatestBlock(prevBlock => {
          // Only update if it's a new block
          if (!prevBlock || block.number > prevBlock.number) {
            // Track block timestamps for rate calculation
            const now = Date.now();
            blockTimestampsRef.current = [
              ...blockTimestampsRef.current.filter(t => now - t < 60000),
              now
            ];
            setBlocksPerMinute(blockTimestampsRef.current.length);

            // Add to live blocks
            setLiveBlocks(prev => {
              const exists = prev.some(b => b.number === block.number);
              if (exists) return prev;
              const updated = [block, ...prev].slice(0, 10);
              return updated;
            });

            return block;
          }
          return prevBlock;
        });
      }
    } catch (error) {
      console.error('Failed to fetch latest block:', error);
    }
  }, []);

  const connect = useCallback(() => {
    // Clean up any existing connections
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Try WebSocket first, fall back to polling
    const infuraWsUrl = `wss://sepolia.infura.io/ws/v3/`;
    
    // Since we can't expose the Infura key in the frontend, we use polling
    // Start polling for new blocks every 12 seconds (average Ethereum block time)
    console.log('[BlockchainWS] Starting block polling...');
    setIsConnected(true);
    
    // Fetch immediately
    fetchLatestBlock();
    
    // Then poll every 12 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchLatestBlock();
    }, 12000);

    toast.success('Live block monitoring started', {
      description: 'Polling Sepolia testnet every 12 seconds'
    });
  }, [fetchLatestBlock]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    toast.info('Live block monitoring stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    latestBlock,
    liveBlocks,
    blocksPerMinute,
    connect,
    disconnect,
  };
}
