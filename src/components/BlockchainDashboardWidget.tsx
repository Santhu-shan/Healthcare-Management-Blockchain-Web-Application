import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ShieldCheck, ShieldX, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface RecentTransaction {
  id: string;
  tx_hash: string;
  block_number: number | null;
  status: string;
  verified: boolean;
  created_at: string;
  patients: { name: string } | null;
}

interface BlockchainStats {
  totalTransactions: number;
  verifiedCount: number;
  pendingCount: number;
  failedCount: number;
  recentTransactions: RecentTransaction[];
}

export default function BlockchainDashboardWidget() {
  const [stats, setStats] = useState<BlockchainStats>({
    totalTransactions: 0,
    verifiedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('blockchain-widget')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blockchain_transactions',
        },
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    try {
      // Get total count
      const { count: total } = await supabase
        .from('blockchain_transactions')
        .select('*', { count: 'exact', head: true });

      // Get verified count
      const { count: verified } = await supabase
        .from('blockchain_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      // Get pending count
      const { count: pending } = await supabase
        .from('blockchain_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get failed count
      const { count: failed } = await supabase
        .from('blockchain_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      // Get recent transactions
      const { data: recent } = await supabase
        .from('blockchain_transactions')
        .select(`
          id,
          tx_hash,
          block_number,
          status,
          verified,
          created_at,
          patients (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalTransactions: total || 0,
        verifiedCount: verified || 0,
        pendingCount: pending || 0,
        failedCount: failed || 0,
        recentTransactions: (recent || []) as RecentTransaction[],
      });
    } catch (error) {
      console.error('Failed to load blockchain stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const shortenHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Boxes className="h-5 w-5 text-primary" />
            Blockchain Activity
          </CardTitle>
          <Link to="/blockchain">
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalTransactions}</p>
            <p className="text-xs text-muted-foreground">Total Tx</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-success">{stats.verifiedCount}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex gap-2">
          {stats.pendingCount > 0 && (
            <Badge variant="outline" className="text-warning border-warning">
              <Clock className="h-3 w-3 mr-1" />
              {stats.pendingCount} Pending
            </Badge>
          )}
          {stats.failedCount > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive">
              <ShieldX className="h-3 w-3 mr-1" />
              {stats.failedCount} Failed
            </Badge>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Recent Transactions</p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : stats.recentTransactions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No transactions yet
            </div>
          ) : (
            stats.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  {tx.verified ? (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  ) : tx.status === 'success' ? (
                    <Boxes className="h-4 w-4 text-primary" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" />
                  )}
                  <div>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {shortenHash(tx.tx_hash)}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    <p className="text-xs text-muted-foreground">{tx.patients?.name}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getTimeAgo(tx.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
