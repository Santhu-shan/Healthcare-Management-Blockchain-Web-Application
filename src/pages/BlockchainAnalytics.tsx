import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Fuel,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

interface Transaction {
  id: string;
  patient_id: string;
  tx_hash: string;
  block_number: number | null;
  gas_used: string | null;
  status: string;
  created_at: string;
}

interface DailyStats {
  date: string;
  total: number;
  verified: number;
  pending: number;
  failed: number;
  avgGas: number;
  totalGas: number;
  gasCount: number;
}

interface VerificationStats {
  name: string;
  value: number;
  color: string;
}

export default function BlockchainAnalytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchTransactions();
  }, [timeRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), days).toISOString();

    const { data, error } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  // Process data for charts
  const dailyStats = useMemo(() => {
    const statsMap = new Map<string, DailyStats>();
    
    transactions.forEach(tx => {
      const date = format(parseISO(tx.created_at), 'yyyy-MM-dd');
      const existing = statsMap.get(date) || {
        date,
        total: 0,
        verified: 0,
        pending: 0,
        failed: 0,
        avgGas: 0,
        totalGas: 0,
        gasCount: 0,
      };

      existing.total++;
      if (tx.status === 'success') existing.verified++;
      else if (tx.status === 'pending') existing.pending++;
      else existing.failed++;

      if (tx.gas_used) {
        existing.totalGas += parseInt(tx.gas_used);
        existing.gasCount++;
      }

      statsMap.set(date, existing);
    });

    return Array.from(statsMap.values()).map(stat => ({
      ...stat,
      avgGas: stat.gasCount > 0 ? Math.round(stat.totalGas / stat.gasCount) : 0,
      displayDate: format(parseISO(stat.date), 'MMM dd'),
    }));
  }, [transactions]);

  // Verification pie chart data
  const verificationStats = useMemo((): VerificationStats[] => {
    const verified = transactions.filter(tx => tx.status === 'success').length;
    const pending = transactions.filter(tx => tx.status === 'pending').length;
    const failed = transactions.filter(tx => tx.status === 'failed').length;

    return [
      { name: 'Verified', value: verified, color: 'hsl(var(--success))' },
      { name: 'Pending', value: pending, color: 'hsl(var(--warning))' },
      { name: 'Failed', value: failed, color: 'hsl(var(--destructive))' },
    ].filter(item => item.value > 0);
  }, [transactions]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = transactions.length;
    const verified = transactions.filter(tx => tx.status === 'success').length;
    const pending = transactions.filter(tx => tx.status === 'pending').length;
    const failed = transactions.filter(tx => tx.status === 'failed').length;
    
    const gasValues = transactions
      .filter(tx => tx.gas_used)
      .map(tx => parseInt(tx.gas_used!));
    
    const avgGas = gasValues.length > 0 
      ? Math.round(gasValues.reduce((a, b) => a + b, 0) / gasValues.length)
      : 0;
    
    const totalGas = gasValues.reduce((a, b) => a + b, 0);
    
    const verificationRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0';

    return { total, verified, pending, failed, avgGas, totalGas, verificationRate };
  }, [transactions]);

  const chartConfig = {
    total: { label: 'Total', color: 'hsl(var(--primary))' },
    verified: { label: 'Verified', color: 'hsl(var(--success))' },
    pending: { label: 'Pending', color: 'hsl(var(--warning))' },
    failed: { label: 'Failed', color: 'hsl(var(--destructive))' },
    avgGas: { label: 'Avg Gas', color: 'hsl(var(--chart-1))' },
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Blockchain Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive analysis of on-chain patient record transactions
            </p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Badge
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.total}</div>
              <p className="text-xs text-muted-foreground">
                On-chain records stored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
              <Shield className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{summaryStats.verificationRate}%</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.verified} of {summaryStats.total} verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Gas Used</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.avgGas.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Gas units per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending/Failed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className="text-warning">{summaryStats.pending}</span>
                {' / '}
                <span className="text-destructive">{summaryStats.failed}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="volume" className="space-y-4">
          <TabsList>
            <TabsTrigger value="volume">
              <BarChart3 className="h-4 w-4 mr-2" />
              Transaction Volume
            </TabsTrigger>
            <TabsTrigger value="verification">
              <Shield className="h-4 w-4 mr-2" />
              Verification Rates
            </TabsTrigger>
            <TabsTrigger value="gas">
              <Fuel className="h-4 w-4 mr-2" />
              Gas Costs
            </TabsTrigger>
          </TabsList>

          {/* Transaction Volume Chart */}
          <TabsContent value="volume">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume Over Time</CardTitle>
                <CardDescription>
                  Daily breakdown of blockchain transactions by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : dailyStats.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No transaction data available for this period
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <AreaChart data={dailyStats}>
                      <defs>
                        <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="displayDate" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="verified"
                        name="Verified"
                        stroke="hsl(var(--success))"
                        fillOpacity={1}
                        fill="url(#colorVerified)"
                        stackId="1"
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        name="Pending"
                        stroke="hsl(var(--warning))"
                        fillOpacity={1}
                        fill="url(#colorPending)"
                        stackId="1"
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        name="Failed"
                        stroke="hsl(var(--destructive))"
                        fillOpacity={1}
                        fill="url(#colorFailed)"
                        stackId="1"
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Rates Chart */}
          <TabsContent value="verification">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Verification Status Distribution</CardTitle>
                  <CardDescription>
                    Overall breakdown of transaction verification states
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : verificationStats.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No verification data available
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={verificationStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {verificationStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Verification Trend</CardTitle>
                  <CardDescription>
                    Daily verification success rate over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : dailyStats.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No trend data available
                    </div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <LineChart data={dailyStats.map(d => ({
                        ...d,
                        rate: d.total > 0 ? Math.round((d.verified / d.total) * 100) : 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="displayDate" className="text-xs" />
                        <YAxis domain={[0, 100]} unit="%" className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          name="Success Rate"
                          stroke="hsl(var(--success))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--success))' }}
                        />
                      </LineChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gas Costs Chart */}
          <TabsContent value="gas">
            <Card>
              <CardHeader>
                <CardTitle>Gas Usage Over Time</CardTitle>
                <CardDescription>
                  Average gas consumed per transaction by day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : dailyStats.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No gas data available for this period
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="displayDate" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="avgGas"
                        name="Avg Gas"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Gas Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Gas Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryStats.totalGas.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cumulative gas consumption
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average per Tx</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryStats.avgGas.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gas units per transaction
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Est. Cost (ETH)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ~{(summaryStats.totalGas * 20 / 1e9).toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At 20 Gwei gas price
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
