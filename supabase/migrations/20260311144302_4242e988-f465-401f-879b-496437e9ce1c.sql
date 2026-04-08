
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE (default OR logic)

-- ==================== PATIENTS ====================
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Admins and assigned doctors can view patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;

CREATE POLICY "patients_select" ON public.patients FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR is_assigned_to_patient(auth.uid(), id)
    OR user_id = auth.uid()
  );

CREATE POLICY "patients_insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

CREATE POLICY "patients_update" ON public.patients FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

CREATE POLICY "patients_delete" ON public.patients FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== VITALS ====================
DROP POLICY IF EXISTS "Admins can manage vitals" ON public.vitals;
DROP POLICY IF EXISTS "Admins and assigned doctors can view vitals" ON public.vitals;
DROP POLICY IF EXISTS "Patients can view own vitals" ON public.vitals;

CREATE POLICY "vitals_select" ON public.vitals FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = vitals.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "vitals_insert" ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

CREATE POLICY "vitals_update" ON public.vitals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vitals_delete" ON public.vitals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== ALERT_LOGS ====================
DROP POLICY IF EXISTS "Admins can manage alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Authorized users can acknowledge alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Admins and assigned doctors can view alerts" ON public.alert_logs;
DROP POLICY IF EXISTS "Patients can view own alerts" ON public.alert_logs;

CREATE POLICY "alert_logs_select" ON public.alert_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = alert_logs.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "alert_logs_insert" ON public.alert_logs FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

CREATE POLICY "alert_logs_update" ON public.alert_logs FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

-- ==================== BLOCKCHAIN_RECORDS ====================
DROP POLICY IF EXISTS "Admins can manage blockchain records" ON public.blockchain_records;
DROP POLICY IF EXISTS "Admins and assigned doctors can view blockchain records" ON public.blockchain_records;
DROP POLICY IF EXISTS "Patients can view own blockchain records" ON public.blockchain_records;

CREATE POLICY "blockchain_records_select" ON public.blockchain_records FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = blockchain_records.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "blockchain_records_insert" ON public.blockchain_records FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

-- ==================== BLOCKCHAIN_TRANSACTIONS ====================
DROP POLICY IF EXISTS "Authorized users can create blockchain transactions" ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Authorized users can update blockchain transactions" ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Admins and assigned doctors can view blockchain transactions" ON public.blockchain_transactions;
DROP POLICY IF EXISTS "Patients can view own blockchain transactions" ON public.blockchain_transactions;

CREATE POLICY "blockchain_tx_select" ON public.blockchain_transactions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = blockchain_transactions.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "blockchain_tx_insert" ON public.blockchain_transactions FOR INSERT TO authenticated
  WITH CHECK (is_authorized(auth.uid()));

CREATE POLICY "blockchain_tx_update" ON public.blockchain_transactions FOR UPDATE TO authenticated
  USING (is_authorized(auth.uid()));

-- ==================== BLOCKCHAIN_AUDIT_TRAIL ====================
DROP POLICY IF EXISTS "System can create audit entries" ON public.blockchain_audit_trail;
DROP POLICY IF EXISTS "Admins can view audit trail" ON public.blockchain_audit_trail;

CREATE POLICY "audit_trail_select" ON public.blockchain_audit_trail FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_authorized(auth.uid())
  );

CREATE POLICY "audit_trail_insert" ON public.blockchain_audit_trail FOR INSERT TO authenticated
  WITH CHECK (is_authorized(auth.uid()));

-- ==================== PRESCRIPTIONS ====================
DROP POLICY IF EXISTS "Admins can manage prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can view assigned patient prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authorized users can create prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authorized users can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;

CREATE POLICY "prescriptions_select" ON public.prescriptions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = prescriptions.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "prescriptions_insert" ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (is_authorized(auth.uid()));

CREATE POLICY "prescriptions_update" ON public.prescriptions FOR UPDATE TO authenticated
  USING (is_authorized(auth.uid()));

-- ==================== CONSENTS ====================
DROP POLICY IF EXISTS "Patients can view own consents" ON public.consents;
DROP POLICY IF EXISTS "Doctors can create consents" ON public.consents;
DROP POLICY IF EXISTS "Patients can update own consents" ON public.consents;
DROP POLICY IF EXISTS "Admins can delete consents" ON public.consents;

CREATE POLICY "consents_select" ON public.consents FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_assigned_to_patient(auth.uid(), patient_id)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = consents.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "consents_insert" ON public.consents FOR INSERT TO authenticated
  WITH CHECK (is_authorized(auth.uid()));

CREATE POLICY "consents_update" ON public.consents FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM patients p WHERE p.id = consents.patient_id AND p.user_id = auth.uid())
  );

CREATE POLICY "consents_delete" ON public.consents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== DOCTORS ====================
DROP POLICY IF EXISTS "Admins can manage doctors" ON public.doctors;
DROP POLICY IF EXISTS "Admins and self can view doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authorized users can view assigned doctors" ON public.doctors;

CREATE POLICY "doctors_select" ON public.doctors FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR user_id = auth.uid()
    OR is_authorized(auth.uid())
  );

CREATE POLICY "doctors_manage" ON public.doctors FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ==================== USER_ROLES ====================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "user_roles_manage" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ==================== NOTIFICATIONS ====================
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ==================== ACCESS_LOGS ====================
DROP POLICY IF EXISTS "Authorized users can view access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Authenticated users can create access logs" ON public.access_logs;

CREATE POLICY "access_logs_select" ON public.access_logs FOR SELECT TO authenticated
  USING (is_authorized(auth.uid()));

CREATE POLICY "access_logs_insert" ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ==================== PATIENT_DOCTOR_ASSIGNMENTS ====================
DROP POLICY IF EXISTS "Authorized users can view assignments" ON public.patient_doctor_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.patient_doctor_assignments;

CREATE POLICY "assignments_select" ON public.patient_doctor_assignments FOR SELECT TO authenticated
  USING (is_authorized(auth.uid()));

CREATE POLICY "assignments_manage" ON public.patient_doctor_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
