import { Link } from 'react-router-dom';
import { Heart, Thermometer, Wind, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PatientWithVitals, VITAL_THRESHOLDS } from '@/types';
import { cn } from '@/lib/utils';

interface PatientCardProps {
  patient: PatientWithVitals;
}

export default function PatientCard({ patient }: PatientCardProps) {
  const vitals = patient.latestVitals;
  const isAlert = vitals?.status === 'ALERT';

  const getVitalColor = (value: number, type: 'heart_rate' | 'temperature' | 'spo2') => {
    const threshold = VITAL_THRESHOLDS[type];
    if (value < threshold.min || value > threshold.max) {
      return 'text-alert';
    }
    return 'text-success';
  };

  return (
    <Link to={`/patients/${patient.id}`}>
      <Card 
        className={cn(
          "transition-all duration-200 hover:shadow-lg cursor-pointer",
          isAlert && "border-alert/50 bg-alert/5 animate-pulse-alert"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                isAlert ? "bg-alert/20" : "bg-primary/20"
              )}>
                <User className={cn(
                  "h-5 w-5",
                  isAlert ? "text-alert" : "text-primary"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{patient.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Room {patient.room_number} • {patient.age}y • {patient.gender}
                </p>
              </div>
            </div>
            <Badge variant={isAlert ? "destructive" : "default"} className={cn(
              isAlert ? "bg-alert" : "bg-success"
            )}>
              {vitals?.status || 'NO DATA'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {vitals ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Heart Rate */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <Heart className={cn("h-5 w-5 mb-1", getVitalColor(vitals.heart_rate, 'heart_rate'))} />
                <span className={cn("text-lg font-bold", getVitalColor(vitals.heart_rate, 'heart_rate'))}>
                  {vitals.heart_rate}
                </span>
                <span className="text-xs text-muted-foreground">bpm</span>
              </div>

              {/* Temperature */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <Thermometer className={cn("h-5 w-5 mb-1", getVitalColor(vitals.temperature, 'temperature'))} />
                <span className={cn("text-lg font-bold", getVitalColor(vitals.temperature, 'temperature'))}>
                  {vitals.temperature}
                </span>
                <span className="text-xs text-muted-foreground">°C</span>
              </div>

              {/* SpO2 */}
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <Wind className={cn("h-5 w-5 mb-1", getVitalColor(vitals.spo2, 'spo2'))} />
                <span className={cn("text-lg font-bold", getVitalColor(vitals.spo2, 'spo2'))}>
                  {vitals.spo2}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No vitals recorded
            </div>
          )}
          
          {patient.diagnosis && (
            <p className="mt-3 text-xs text-muted-foreground truncate">
              {patient.diagnosis}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
