import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertLog } from '@/types';
import { cn } from '@/lib/utils';

interface AlertPanelProps {
  alerts: (AlertLog & { patient_name?: string })[];
  onAcknowledge?: (alertId: string) => void;
}

export default function AlertPanel({ alerts, onAcknowledge }: AlertPanelProps) {
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-alert" />
            Active Alerts
          </CardTitle>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="bg-alert animate-pulse-alert">
              {unacknowledgedCount} Unacknowledged
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-2 text-success" />
              <p>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    alert.acknowledged 
                      ? "bg-muted/50 border-border" 
                      : alert.severity === 'critical'
                        ? "bg-alert/10 border-alert/30"
                        : "bg-warning/10 border-warning/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            alert.severity === 'critical' 
                              ? "border-alert text-alert" 
                              : "border-warning text-warning"
                          )}
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.patient_name && (
                          <span className="text-sm font-medium">{alert.patient_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{alert.message}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!alert.acknowledged && onAcknowledge && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAcknowledge(alert.id)}
                        className="shrink-0"
                      >
                        Acknowledge
                      </Button>
                    )}
                    {alert.acknowledged && (
                      <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
