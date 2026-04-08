
-- 1. Add 'pending' to app_role enum for new user registration
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pending';

-- 2. Update handle_new_user to assign 'pending' role instead of 'doctor'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  
  -- Assign pending role - requires admin approval to become doctor/admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'pending');
  
  RETURN new;
END;
$$;

-- 3. Create helper function to check if a doctor is assigned to a patient
CREATE OR REPLACE FUNCTION public.is_assigned_to_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_doctor_assignments pda
    INNER JOIN public.doctors d ON pda.doctor_id = d.id
    WHERE d.user_id = _user_id
    AND pda.patient_id = _patient_id
  )
$$;

-- 4. Fix PATIENTS table RLS - restrict to admins + assigned doctors
DROP POLICY IF EXISTS "Authorized users can view patients" ON public.patients;
CREATE POLICY "Admins and assigned doctors can view patients"
ON public.patients FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_assigned_to_patient(auth.uid(), id)
);

-- 5. Fix VITALS table RLS - restrict to admins + assigned doctors
DROP POLICY IF EXISTS "Authorized users can view vitals" ON public.vitals;
CREATE POLICY "Admins and assigned doctors can view vitals"
ON public.vitals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_assigned_to_patient(auth.uid(), patient_id)
);

-- 6. Fix ALERT_LOGS table RLS - restrict to admins + assigned doctors
DROP POLICY IF EXISTS "Authorized users can view alerts" ON public.alert_logs;
CREATE POLICY "Admins and assigned doctors can view alerts"
ON public.alert_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_assigned_to_patient(auth.uid(), patient_id)
);

-- 7. Fix BLOCKCHAIN_RECORDS table RLS - restrict to admins + assigned doctors
DROP POLICY IF EXISTS "Authorized users can view blockchain records" ON public.blockchain_records;
CREATE POLICY "Admins and assigned doctors can view blockchain records"
ON public.blockchain_records FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_assigned_to_patient(auth.uid(), patient_id)
);

-- 8. Fix BLOCKCHAIN_TRANSACTIONS table RLS - restrict to admins + assigned doctors
DROP POLICY IF EXISTS "Authorized users can view blockchain transactions" ON public.blockchain_transactions;
CREATE POLICY "Admins and assigned doctors can view blockchain transactions"
ON public.blockchain_transactions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_assigned_to_patient(auth.uid(), patient_id)
);

-- 9. Fix BLOCKCHAIN_AUDIT_TRAIL table RLS - restrict to admins + assigned doctors via block
DROP POLICY IF EXISTS "Authorized users can view audit trail" ON public.blockchain_audit_trail;
CREATE POLICY "Admins can view audit trail"
ON public.blockchain_audit_trail FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 10. Fix DOCTORS table RLS - restrict contact info: only admins and self can view
DROP POLICY IF EXISTS "Authorized users can view doctors" ON public.doctors;
CREATE POLICY "Admins and self can view doctors"
ON public.doctors FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
);

-- 11. Allow all authorized users to see basic doctor info (name, specialization, department) via a view
-- Doctors assigned to same patients can see each other's basic info
CREATE POLICY "Authorized users can view assigned doctors"
ON public.doctors FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patient_doctor_assignments pda1
    INNER JOIN public.doctors d1 ON pda1.doctor_id = d1.id
    INNER JOIN public.patient_doctor_assignments pda2 ON pda1.patient_id = pda2.patient_id
    INNER JOIN public.doctors d2 ON pda2.doctor_id = d2.id
    WHERE d1.user_id = auth.uid()
    AND d2.id = doctors.id
  )
);
