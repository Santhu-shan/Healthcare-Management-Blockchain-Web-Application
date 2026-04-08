import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'alert';
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  variant = 'default'
}: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          iconBg: 'bg-success/20',
          iconColor: 'text-success',
        };
      case 'warning':
        return {
          iconBg: 'bg-warning/20',
          iconColor: 'text-warning',
        };
      case 'alert':
        return {
          iconBg: 'bg-alert/20',
          iconColor: 'text-alert',
        };
      default:
        return {
          iconBg: 'bg-primary/20',
          iconColor: 'text-primary',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", styles.iconBg)}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
