-- Create role enum
CREATE TYPE public.user_role AS ENUM ('owner', 'franchise_owner', 'manager', 'shift_lead', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  pin_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create trucks table
CREATE TABLE public.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_plate TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  clock_in_location TEXT,
  clock_out_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create compliance_checklists table
CREATE TABLE public.compliance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE NOT NULL,
  checklist_type TEXT NOT NULL, -- 'opening', 'closing', 'daily', etc
  checklist_date DATE NOT NULL,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::JSONB,
  signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.compliance_checklists ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for trucks
CREATE POLICY "Authenticated users can view trucks"
  ON public.trucks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and owners can manage trucks"
  ON public.trucks FOR ALL
  USING (
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for time_entries
CREATE POLICY "Employees can view their own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Managers can view all time entries"
  ON public.time_entries FOR SELECT
  USING (
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'shift_lead')
  );

CREATE POLICY "Employees can insert their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Managers can update time entries"
  ON public.time_entries FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'shift_lead')
  );

-- RLS Policies for compliance_checklists
CREATE POLICY "Authenticated users can view checklists"
  ON public.compliance_checklists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can create checklists"
  ON public.compliance_checklists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update checklists"
  ON public.compliance_checklists FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'owner') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'shift_lead')
  );

-- Trigger to update profiles timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();