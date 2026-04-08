
-- Appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id),
  appointment_date timestamp with time zone NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  tx_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Bills table
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id),
  description text NOT NULL,
  amount_usd numeric NOT NULL,
  eth_amount text,
  tx_hash text,
  from_address text,
  to_address text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Appointments RLS policies
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'doctor') OR
    EXISTS (SELECT 1 FROM patients p WHERE p.id = appointments.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM patients p WHERE p.id = appointments.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM patients p WHERE p.id = appointments.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "appointments_delete" ON public.appointments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Bills RLS policies
CREATE POLICY "bills_select" ON public.bills
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM patients p WHERE p.id = bills.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM patients p WHERE p.id = bills.patient_id AND p.user_id = auth.uid())
  );

-- Add wallet_address to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address text;

-- Add admin_wallet_address to a simple config approach - store in profiles for admin users
