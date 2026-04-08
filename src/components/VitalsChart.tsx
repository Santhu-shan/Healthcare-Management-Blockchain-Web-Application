import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vital, VITAL_THRESHOLDS } from '@/types';

interface VitalsChartProps {
  vitals: Vital[];
  type: 'heart_rate' | 'temperature' | 'spo2';
  title: string;
}

export default function VitalsChart({ vitals, type, title }: VitalsChartProps) {
  const threshold = VITAL_THRESHOLDS[type];
  
  const data = vitals.map((v) => ({
    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: v[type],
  }));

  const getColor = () => {
    switch (type) {
      case 'heart_rate':
        return 'hsl(0, 72%, 51%)';
      case 'temperature':
        return 'hsl(38, 92%, 50%)';
      case 'spo2':
        return 'hsl(195, 85%, 35%)';
      default:
        return 'hsl(195, 85%, 35%)';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Normal range: {threshold.min} - {threshold.max} {threshold.unit}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                domain={[threshold.min - 10, threshold.max + 10]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <ReferenceLine 
                y={threshold.min} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5" 
                label={{ value: 'Min', position: 'left', fontSize: 10, fill: 'hsl(var(--warning))' }}
              />
              <ReferenceLine 
                y={threshold.max} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5" 
                label={{ value: 'Max', position: 'left', fontSize: 10, fill: 'hsl(var(--warning))' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={getColor()}
                strokeWidth={2}
                dot={{ fill: getColor(), strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
