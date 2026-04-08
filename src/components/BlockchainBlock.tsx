import { CheckCircle, Clock, XCircle, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BlockchainRecord } from '@/types';
import { cn } from '@/lib/utils';

interface BlockchainBlockProps {
  block: BlockchainRecord;
  isFirst?: boolean;
}

export default function BlockchainBlock({ block, isFirst }: BlockchainBlockProps) {
  const getStatusIcon = () => {
    switch (block.consensus_status) {
      case 'validated':
        return <CheckCircle className="h-4 w-4 text-consensus" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-alert" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = () => {
    switch (block.consensus_status) {
      case 'validated':
        return <Badge className="bg-consensus">Validated</Badge>;
      case 'rejected':
        return <Badge className="bg-alert">Rejected</Badge>;
      default:
        return <Badge className="bg-warning">Pending</Badge>;
    }
  };

  const formatHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="flex items-start gap-4">
      {/* Chain connector */}
      {!isFirst && (
        <div className="flex flex-col items-center -mt-4">
          <div className="w-0.5 h-8 bg-gradient-to-b from-block to-block/50" />
          <LinkIcon className="h-4 w-4 text-block rotate-90" />
        </div>
      )}
      
      <Card className={cn(
        "flex-1 border-2 transition-all hover:shadow-lg",
        block.consensus_status === 'validated' && "border-consensus/30",
        block.consensus_status === 'rejected' && "border-alert/30",
        block.consensus_status === 'pending' && "border-warning/30"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-block flex items-center justify-center text-block-foreground font-bold text-sm">
                #{block.block_number}
              </div>
              <div>
                <h4 className="font-semibold text-sm">Block #{block.block_number}</h4>
                <p className="text-xs text-muted-foreground">
                  {new Date(block.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Hashes */}
          <div className="space-y-2 text-xs font-mono">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 bg-muted rounded cursor-help">
                  <span className="text-muted-foreground w-16">Prev:</span>
                  <span className="text-hash">{formatHash(block.previous_hash)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{block.previous_hash}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 bg-muted rounded cursor-help">
                  <span className="text-muted-foreground w-16">Hash:</span>
                  <span className="text-primary">{formatHash(block.current_hash)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{block.current_hash}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Patient Data */}
          <div className="p-3 bg-accent/50 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-1">
              {block.data_summary.patient_name}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>HR: {block.data_summary.heart_rate} bpm</span>
              <span>Temp: {block.data_summary.temperature}°C</span>
              <span>SpO₂: {block.data_summary.spo2}%</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "mt-2 text-xs",
                block.data_summary.status === 'ALERT' ? "border-alert text-alert" : "border-success text-success"
              )}
            >
              {block.data_summary.status}
            </Badge>
          </div>

          {/* Consensus Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Validators:</span>{' '}
              {block.validated_by?.join(', ') || 'Pending'}
            </div>
            <div>
              <span className="font-medium">Time:</span>{' '}
              {block.validation_time_ms}ms
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
