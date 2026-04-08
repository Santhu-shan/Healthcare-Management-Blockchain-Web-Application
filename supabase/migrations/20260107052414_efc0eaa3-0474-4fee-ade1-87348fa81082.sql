-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('doctor', 'admin');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  room_number TEXT NOT NULL,
  admission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  diagnosis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vitals table for storing patient vital readings
CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  heart_rate INTEGER NOT NULL,
  temperature DECIMAL(4,1) NOT NULL,
  spo2 INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'NORMAL',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blockchain_records table for simulated blockchain
CREATE TABLE public.blockchain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_number INTEGER NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  vital_id UUID REFERENCES public.vitals(id) ON DELETE CASCADE NOT NULL,
  data_summary JSONB NOT NULL,
  consensus_status TEXT NOT NULL DEFAULT 'pending',
  validated_by TEXT[],
  validation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_logs table for tracking critical events
CREATE TABLE public.alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  vital_id UUID REFERENCES public.vitals(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create access_logs table for smart contract audit trail
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any authorized role
CREATE OR REPLACE FUNCTION public.is_authorized(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('doctor', 'admin')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Patients policies (only authorized users can access)
CREATE POLICY "Authorized users can view patients"
ON public.patients FOR SELECT
TO authenticated
USING (public.is_authorized(auth.uid()));

CREATE POLICY "Admins can manage patients"
ON public.patients FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Vitals policies
CREATE POLICY "Authorized users can view vitals"
ON public.vitals FOR SELECT
TO authenticated
USING (public.is_authorized(auth.uid()));

CREATE POLICY "Admins can manage vitals"
ON public.vitals FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Blockchain records policies
CREATE POLICY "Authorized users can view blockchain records"
ON public.blockchain_records FOR SELECT
TO authenticated
USING (public.is_authorized(auth.uid()));

CREATE POLICY "Admins can manage blockchain records"
ON public.blockchain_records FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Alert logs policies
CREATE POLICY "Authorized users can view alerts"
ON public.alert_logs FOR SELECT
TO authenticated
USING (public.is_authorized(auth.uid()));

CREATE POLICY "Authorized users can acknowledge alerts"
ON public.alert_logs FOR UPDATE
TO authenticated
USING (public.is_authorized(auth.uid()));

CREATE POLICY "Admins can manage alerts"
ON public.alert_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Access logs policies
CREATE POLICY "Authorized users can view access logs"
ON public.access_logs FOR SELECT
TO authenticated
USING (public.is_authorized(auth.uid()));

CREATE POLICY "Authenticated users can create access logs"
ON public.access_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  
  -- Default role is doctor
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'doctor');
  
  RETURN new;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for vitals and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_logs;