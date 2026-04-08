
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE (default)
-- Tables: patients, vitals, alert_logs, blockchain_records, blockchain_transactions, prescriptions, consents, doctors, user_roles, notifications, access_logs, profiles, patient_doctor_assignments, blockchain_audit_trail

-- ============ PATIENTS ============
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Admins and assigned doctors can view patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;

CREATE POLICY "Admins can manage patients" ON public.patients FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins and assigned doctors can view patients" ON public.patients FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned_to_patient(auth.uid(), id));
CREATE POLICY "Patients can view own data" ON public.patients FOR SELECT TO public USING (user_id = auth.uid());

-- ============ VITALS ============
DROP POLICY IF EXISTS "Admins can manage vitals" ON public.vitals;
DROP POLICY IF EXISTS "Admins and assigned doctors can view vitals" ON public.vitals;
DROP POLICY IF EXISTS "Patients can view own vitals" ON public.vitals;

CREATE POLICY "Admins can manage vitals" ON public.vitals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins and assigned doctors can view vitals" ON public.vitals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can view own vitals" ON public.vitals FOR SELECT TO public USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = vitals.patient_id AND p.user_id = auth.uid()));

-- ============ ALERT_LOGS ============
DROP POLICY IF EXISTS "Authorized users can acknowledge alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Admins can manage alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Admins and assigned doctors can view alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Patients can view own alerts" ON public.alert_logs;

CREATE POLICY "Admins can manage alerts" ON public.alert_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized users can acknowledge alerts" ON public.alert_logs FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "Admins and assigned doctors can view alerts" ON public.alert_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can view own alerts" ON public.alert_logs FOR SELECT TO public USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = alert_logs.patient_id AND p.user_id = auth.uid()));

-- ============ BLOCKCHAIN_RECORDS ============
DROP POLICY IF EXISTS "Admins can manage blockchain records" ON public.blockchain_records;
DROP POLICY IF EXISTS "Admins and assigned doctors can view blockchain records" ON public.blockchain_records;
DROP POLICY IF EXISTS "Patients can view own blockchain records" ON public.blockchain_records;

CREATE POLICY "Admins can manage blockchain records" ON public.blockchain_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins and assigned doctors can view blockchain records" ON public.blockchain_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can view own blockchain records" ON public.blockchain_records FOR SELECT TO public USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = blockchain_records.patient_id AND p.user_id = auth.uid()));

-- ============ BLOCKCHAIN_TRANSACTIONS ============
DROP POLICY IF EXISTS "Authorized users can create blockchain transactions" ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Authorized users can update blockchain transactions" ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Admins and assigned doctors can view blockchain transactions" ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Patients can view own blockchain transactions" ON public.blockchain_transactions;

CREATE POLICY "Authorized users can create blockchain transactions" ON public.blockchain_transactions FOR INSERT TO public WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "Authorized users can update blockchain transactions" ON public.blockchain_transactions FOR UPDATE TO public USING (is_authorized(auth.uid()));
CREATE POLICY "Admins and assigned doctors can view blockchain transactions" ON public.blockchain_transactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Patients can view own blockchain transactions" ON public.blockchain_transactions FOR SELECT TO public USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = blockchain_transactions.patient_id AND p.user_id = auth.uid()));

-- ============ PRESCRIPTIONS ============
DROP POLICY IF EXISTS "Admins can manage prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can view assigned patient prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authorized users can create prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authorized users can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;

CREATE POLICY "Admins can manage prescriptions" ON public.prescriptions FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can view assigned patient prescriptions" ON public.prescriptions FOR SELECT TO public USING (is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Authorized users can create prescriptions" ON public.prescriptions FOR INSERT TO public WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "Authorized users can update prescriptions" ON public.prescriptions FOR UPDATE TO public USING (is_authorized(auth.uid()));
CREATE POLICY "Patients can view own prescriptions" ON public.prescriptions FOR SELECT TO public USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = prescriptions.patient_id AND p.user_id = auth.uid()));

-- ============ CONSENTS ============
DROP POLICY IF EXISTS "Patients can view own consents" ON public.consents;
DROP POLICY IF EXISTS "Doctors can create consents" ON public.consents;
DROP POLICY IF EXISTS "Patients can update own consents" ON public.consents;
DROP POLICY IF EXISTS "Admins can delete consents" ON public.consents;

CREATE POLICY "Patients can view own consents" ON public.consents FOR SELECT TO public USING ((EXISTS (SELECT 1 FROM patients p WHERE p.id = consents.patient_id AND p.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role) OR is_assigned_to_patient(auth.uid(), patient_id));
CREATE POLICY "Doctors can create consents" ON public.consents FOR INSERT TO public WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "Patients can update own consents" ON public.consents FOR UPDATE TO public USING ((EXISTS (SELECT 1 FROM patients p WHERE p.id = consents.patient_id AND p.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete consents" ON public.consents FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ DOCTORS ============
DROP POLICY IF EXISTS "Admins can manage doctors" ON public.doctors;
DROP POLICY IF EXISTS "Admins and self can view doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authorized users can view assigned doctors" ON public.doctors;

CREATE POLICY "Admins can manage doctors" ON public.doctors FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins and self can view doctors" ON public.doctors FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid());
CREATE POLICY "Authorized users can view assigned doctors" ON public.doctors FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM patient_doctor_assignments pda1 JOIN doctors d1 ON pda1.doctor_id = d1.id JOIN patient_doctor_assignments pda2 ON pda1.patient_id = pda2.patient_id JOIN doctors d2 ON pda2.doctor_id = d2.id WHERE d1.user_id = auth.uid() AND d2.id = doctors.id));

-- ============ USER_ROLES ============
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ ACCESS_LOGS ============
DROP POLICY IF EXISTS "Authorized users can view access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Authenticated users can create access logs" ON public.access_logs;

CREATE POLICY "Authorized users can view access logs" ON public.access_logs FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "Authenticated users can create access logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO public USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);

-- ============ PATIENT_DOCTOR_ASSIGNMENTS ============
DROP POLICY IF EXISTS "Authorized users can view assignments" ON public.patient_doctor_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.patient_doctor_assignments;

CREATE POLICY "Authorized users can view assignments" ON public.patient_doctor_assignments FOR SELECT TO public USING (is_authorized(auth.uid()));
CREATE POLICY "Admins can manage assignments" ON public.patient_doctor_assignments FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ BLOCKCHAIN_AUDIT_TRAIL ============
DROP POLICY IF EXISTS "System can create audit entries" ON public.blockchain_audit_trail;
DROP POLICY IF EXISTS "Admins can view audit trail" ON public.blockchain_audit_trail;

CREATE POLICY "System can create audit entries" ON public.blockchain_audit_trail FOR INSERT TO public WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "Admins can view audit trail" ON public.blockchain_audit_trail FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
