import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { hashPatientId } from '@/lib/ethereum';

interface QRCodeGeneratorProps {
  patientId: string;
  patientName: string;
  readingId?: number;
  blockHash?: string;
  etherscanTxHash?: string;
  tamperStatus?: 'verified' | 'tampered' | 'unknown';
}

/**
 * QR Code Generator — encodes privacy-safe data only.
 * Uses patientIdHash (keccak256 of UUID) instead of raw patient ID.
 * Optionally includes readingId for on-chain lookup.
 */
export function QRCodeGenerator({
  patientId,
  patientName,
  readingId,
  blockHash,
  etherscanTxHash,
  tamperStatus = 'unknown',
}: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const patientIdHash = hashPatientId(patientId);

  // Build privacy-safe verify URL: uses hash, not raw UUID
  const params = new URLSearchParams();
  params.set('ph', patientIdHash);
  if (readingId) params.set('rid', String(readingId));
  if (blockHash) params.set('hash', blockHash);

  const verifyUrl = `${window.location.origin}/verify?${params.toString()}`;
  const etherscanUrl = etherscanTxHash ? `https://sepolia.etherscan.io/tx/${etherscanTxHash}` : null;

  // QR encodes just the verify URL — no raw patient data
  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast({ title: 'Verification URL copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <QrCode className="h-4 w-4" />
          Generate QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Blockchain Verification QR
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={verifyUrl} size={200} level="M" includeMargin />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-sm">{patientName}</p>
            {readingId && (
              <p className="text-xs text-muted-foreground">On-chain Reading #{readingId}</p>
            )}
            {blockHash && (
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono block truncate max-w-[280px]">
                {blockHash}
              </code>
            )}
            <div className="flex items-center justify-center gap-1 mt-1">
              {tamperStatus === 'verified' && (
                <span className="text-xs text-success font-medium">✓ Verified on Blockchain</span>
              )}
              {tamperStatus === 'tampered' && (
                <span className="text-xs text-destructive font-medium">✗ Tamper Detected</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Privacy-safe: only hashed identifiers are encoded
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy URL'}
            </Button>
            {etherscanUrl && (
              <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                <a href={etherscanUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Etherscan
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
