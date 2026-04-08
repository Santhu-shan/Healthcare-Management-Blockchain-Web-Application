
-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  blockchain_hash TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage prescriptions"
ON public.prescriptions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Doctors can view prescriptions for assigned patients
CREATE POLICY "Doctors can view assigned patient prescriptions"
ON public.prescriptions FOR SELECT
USING (public.is_assigned_to_patient(auth.uid(), patient_id));

-- Authorized users (doctors/admins) can create prescriptions
CREATE POLICY "Authorized users can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (public.is_authorized(auth.uid()));

-- Authorized users can update prescriptions
CREATE POLICY "Authorized users can update prescriptions"
ON public.prescriptions FOR UPDATE
USING (public.is_authorized(auth.uid()));

-- Patients can view own prescriptions
CREATE POLICY "Patients can view own prescriptions"
ON public.prescriptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patients p
  WHERE p.id = prescriptions.patient_id AND p.user_id = auth.uid()
));

-- Update trigger
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
