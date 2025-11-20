-- Create employee onboarding table
CREATE TABLE public.employee_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- W-4 Information
  filing_status TEXT,
  allowances INTEGER,
  additional_withholding DECIMAL(10,2),
  exempt_from_withholding BOOLEAN DEFAULT FALSE,
  
  -- Direct Deposit
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  routing_number TEXT,
  account_number_encrypted TEXT,
  
  -- Emergency Contacts
  emergency_contact_1_name TEXT,
  emergency_contact_1_relationship TEXT,
  emergency_contact_1_phone TEXT,
  emergency_contact_2_name TEXT,
  emergency_contact_2_relationship TEXT,
  emergency_contact_2_phone TEXT,
  
  -- Completion tracking
  w4_completed BOOLEAN DEFAULT FALSE,
  direct_deposit_completed BOOLEAN DEFAULT FALSE,
  emergency_contacts_completed BOOLEAN DEFAULT FALSE,
  documents_completed BOOLEAN DEFAULT FALSE,
  policies_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding"
ON public.employee_onboarding
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
ON public.employee_onboarding
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
ON public.employee_onboarding
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all onboarding"
ON public.employee_onboarding
FOR SELECT
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- Create employee documents table
CREATE TABLE public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('food_handler', 'drivers_license', 'other')),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  expiration_date DATE,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON public.employee_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view all documents"
ON public.employee_documents
FOR SELECT
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- Create policy acknowledgements table
CREATE TABLE public.policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('handbook', 'safety', 'harassment', 'confidentiality')),
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acknowledgements"
ON public.policy_acknowledgements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own acknowledgements"
ON public.policy_acknowledgements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view all acknowledgements"
ON public.policy_acknowledgements
FOR SELECT
USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- RLS policies for employee documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can view all employee documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_onboarding_updated_at
BEFORE UPDATE ON public.employee_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_employee_onboarding_user ON public.employee_onboarding(user_id);
CREATE INDEX idx_employee_documents_user ON public.employee_documents(user_id);
CREATE INDEX idx_policy_acknowledgements_user ON public.policy_acknowledgements(user_id);