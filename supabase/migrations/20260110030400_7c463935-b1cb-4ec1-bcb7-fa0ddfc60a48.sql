-- Create doctors table to store doctor details
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patient_doctor_assignments table for doctor-patient relationships
CREATE TABLE public.patient_doctor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(patient_id, doctor_id)
);

-- Create blockchain_audit_trail for security demonstration
CREATE TABLE public.blockchain_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID REFERENCES public.blockchain_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  ip_address TEXT,
  user_agent TEXT,
  integrity_verified BOOLEAN NOT NULL DEFAULT true,
  verification_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_audit_trail ENABLE ROW LEVEL SECURITY;

-- Doctors table policies
CREATE POLICY "Authorized users can view doctors"
ON public.doctors FOR SELECT
USING (is_authorized(auth.uid()));

CREATE POLICY "Admins can manage doctors"
ON public.doctors FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Patient-doctor assignments policies
CREATE POLICY "Authorized users can view assignments"
ON public.patient_doctor_assignments FOR SELECT
USING (is_authorized(auth.uid()));

CREATE POLICY "Admins can manage assignments"
ON public.patient_doctor_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Blockchain audit trail policies
CREATE POLICY "Authorized users can view audit trail"
ON public.blockchain_audit_trail FOR SELECT
USING (is_authorized(auth.uid()));

CREATE POLICY "System can create audit entries"
ON public.blockchain_audit_trail FOR INSERT
WITH CHECK (is_authorized(auth.uid()));

-- Add trigger for doctors updated_at
CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add blood_pressure and respiratory_rate to vitals table
ALTER TABLE public.vitals 
ADD COLUMN blood_pressure_systolic INTEGER,
ADD COLUMN blood_pressure_diastolic INTEGER,
ADD COLUMN respiratory_rate INTEGER;

-- Add assigned_doctor_id to patients table
ALTER TABLE public.patients 
ADD COLUMN assigned_doctor_id UUID REFERENCES public.doctors(id);

-- Insert sample doctors data
INSERT INTO public.doctors (name, specialization, license_number, department, contact_email, contact_phone) VALUES
('Dr. Sarah Chen', 'Cardiologist', 'MED-2024-0001', 'Cardiology', 'sarah.chen@hospital.org', '+1-555-0101'),
('Dr. Michael Johnson', 'Pulmonologist', 'MED-2024-0002', 'Pulmonology', 'michael.johnson@hospital.org', '+1-555-0102'),
('Dr. Emily Rodriguez', 'Internal Medicine', 'MED-2024-0003', 'Internal Medicine', 'emily.rodriguez@hospital.org', '+1-555-0103'),
('Dr. James Wilson', 'Emergency Medicine', 'MED-2024-0004', 'Emergency', 'james.wilson@hospital.org', '+1-555-0104'),
('Dr. Aisha Patel', 'Neurologist', 'MED-2024-0005', 'Neurology', 'aisha.patel@hospital.org', '+1-555-0105');