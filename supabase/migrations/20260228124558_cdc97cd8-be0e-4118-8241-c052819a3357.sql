
-- 1. Add 'patient' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'patient';

-- 2. Add user_id to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS user_id uuid;

-- 3. Create consents table
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'read',
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  blockchain_tx_hash text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- 4. Consents RLS policies
CREATE POLICY "Patients can view own consents"
  ON public.consents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.patients p WHERE p.id = consents.patient_id AND p.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
  );

CREATE POLICY "Doctors can create consents"
  ON public.consents FOR INSERT
  WITH CHECK (is_authorized(auth.uid()));

CREATE POLICY "Patients can update own consents"
  ON public.consents FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.patients p WHERE p.id = consents.patient_id AND p.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete consents"
  ON public.consents FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Patient self-access RLS policies
CREATE POLICY "Patients can view own data"
  ON public.patients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Patients can view own vitals"
  ON public.vitals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = vitals.patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Patients can view own alerts"
  ON public.alert_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = alert_logs.patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Patients can view own blockchain transactions"
  ON public.blockchain_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = blockchain_transactions.patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Patients can view own blockchain records"
  ON public.blockchain_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = blockchain_records.patient_id AND p.user_id = auth.uid()));

-- 6. Update handle_new_user for role selection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_role text;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  
  selected_role := new.raw_user_meta_data ->> 'role';
  
  IF selected_role = 'patient' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'patient');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'pending');
  END IF;
  
  RETURN new;
END;
$function$;
