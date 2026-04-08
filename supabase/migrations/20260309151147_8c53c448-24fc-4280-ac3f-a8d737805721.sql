
-- ══════════════════════════════════════════════════════════════════
-- 1. NOTIFICATIONS TABLE (missing from DB)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  related_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  related_alert_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ══════════════════════════════════════════════════════════════════
-- 2. BLOCKCHAIN_RECORDS: Append-only enforcement
-- ══════════════════════════════════════════════════════════════════

-- Prevent UPDATE on blockchain_records (immutable ledger)
CREATE OR REPLACE FUNCTION public.prevent_blockchain_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'blockchain_records is append-only: UPDATE and DELETE are not allowed';
END;
$$;

DROP TRIGGER IF EXISTS prevent_blockchain_update ON public.blockchain_records;
CREATE TRIGGER prevent_blockchain_update
  BEFORE UPDATE ON public.blockchain_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_blockchain_record_mutation();

DROP TRIGGER IF EXISTS prevent_blockchain_delete ON public.blockchain_records;
CREATE TRIGGER prevent_blockchain_delete
  BEFORE DELETE ON public.blockchain_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_blockchain_record_mutation();

-- ══════════════════════════════════════════════════════════════════
-- 3. Auto-set block_number, previous_hash, current_hash on INSERT
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auto_chain_blockchain_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_block RECORD;
  chain_data text;
BEGIN
  -- Get last block for this chain
  SELECT block_number, current_hash INTO last_block
    FROM public.blockchain_records
    ORDER BY block_number DESC
    LIMIT 1;

  IF last_block IS NULL THEN
    NEW.block_number := 1;
    NEW.previous_hash := '0000000000000000000000000000000000000000000000000000000000000000';
  ELSE
    NEW.block_number := last_block.block_number + 1;
    NEW.previous_hash := last_block.current_hash;
  END IF;

  -- Compute current_hash from canonical fields using SHA-256
  chain_data := NEW.block_number::text || NEW.previous_hash || NEW.patient_id::text || NEW.vital_id::text || NEW.data_summary::text || NEW.created_at::text;
  NEW.current_hash := encode(digest(chain_data, 'sha256'), 'hex');

  RETURN NEW;
END;
$$;

-- Only apply if pgcrypto is available (it is on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS auto_chain_block ON public.blockchain_records;
CREATE TRIGGER auto_chain_block
  BEFORE INSERT ON public.blockchain_records
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_chain_blockchain_record();
