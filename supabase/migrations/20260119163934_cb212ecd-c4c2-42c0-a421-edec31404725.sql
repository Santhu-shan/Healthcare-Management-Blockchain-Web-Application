-- Create blockchain_transactions table to track all on-chain transactions
CREATE TABLE public.blockchain_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vital_id UUID REFERENCES public.vitals(id) ON DELETE SET NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number INTEGER,
  from_address TEXT NOT NULL,
  gas_used TEXT,
  data_hash TEXT NOT NULL,
  vitals_summary JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- Authorized users can view transactions
CREATE POLICY "Authorized users can view blockchain transactions"
ON public.blockchain_transactions
FOR SELECT
USING (is_authorized(auth.uid()));

-- Authorized users can create transactions
CREATE POLICY "Authorized users can create blockchain transactions"
ON public.blockchain_transactions
FOR INSERT
WITH CHECK (is_authorized(auth.uid()));

-- Authorized users can update transactions (for verification)
CREATE POLICY "Authorized users can update blockchain transactions"
ON public.blockchain_transactions
FOR UPDATE
USING (is_authorized(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_blockchain_transactions_patient_id ON public.blockchain_transactions(patient_id);
CREATE INDEX idx_blockchain_transactions_tx_hash ON public.blockchain_transactions(tx_hash);
CREATE INDEX idx_blockchain_transactions_created_at ON public.blockchain_transactions(created_at DESC);