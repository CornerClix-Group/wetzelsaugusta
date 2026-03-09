
-- QSCE Visit tables
CREATE TABLE public.qsce_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid REFERENCES public.trucks(id) NOT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  evaluator_id uuid REFERENCES public.profiles(id),
  kahala_store_number text,
  city_state text,
  franchisee_email text,
  franchisee_name text,
  posted_health_score text,
  net_sales text,
  start_time timestamptz,
  end_time timestamptz,
  cleanliness_score numeric DEFAULT 0,
  cleanliness_possible numeric DEFAULT 71,
  operations_score numeric DEFAULT 0,
  operations_possible numeric DEFAULT 109,
  service_score numeric DEFAULT 0,
  service_possible numeric DEFAULT 70,
  total_score numeric DEFAULT 0,
  total_possible numeric DEFAULT 250,
  percentage numeric DEFAULT 0,
  status text DEFAULT 'in_progress',
  compliance_issues jsonb DEFAULT '[]'::jsonb,
  action_plan_strengths text,
  action_plan_opportunities text,
  action_plan_tasks jsonb DEFAULT '[]'::jsonb,
  summary_comments text,
  franchisee_signature text,
  evaluator_signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.qsce_visit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.qsce_visits(id) ON DELETE CASCADE NOT NULL,
  section_id text NOT NULL,
  points_awarded numeric DEFAULT 0,
  points_possible numeric NOT NULL,
  is_compliance_item boolean DEFAULT false,
  notes text,
  photos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Inventory tables
CREATE TABLE public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.inventory_categories(id),
  unit text NOT NULL DEFAULT 'each',
  par_level numeric NOT NULL DEFAULT 0,
  current_quantity numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  supplier text,
  sku text,
  is_active boolean DEFAULT true,
  truck_id uuid REFERENCES public.trucks(id),
  low_stock_alert_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL,
  performed_by uuid REFERENCES public.profiles(id),
  notes text,
  document_id uuid,
  truck_id uuid REFERENCES public.trucks(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.inventory_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text NOT NULL DEFAULT 'invoice',
  uploaded_by uuid REFERENCES public.profiles(id),
  parsed_data jsonb DEFAULT '{}'::jsonb,
  truck_id uuid REFERENCES public.trucks(id),
  created_at timestamptz DEFAULT now()
);

-- Add FK for inventory_transactions.document_id
ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);

-- Enable RLS
ALTER TABLE public.qsce_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qsce_visit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for QSCE tables (owner/manager only)
CREATE POLICY "Owners and managers can manage QSCE visits" ON public.qsce_visits
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Owners and managers can manage QSCE visit items" ON public.qsce_visit_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

-- RLS policies for inventory tables
CREATE POLICY "Owners and managers full access to categories" ON public.inventory_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Authenticated can view categories" ON public.inventory_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners and managers full access to items" ON public.inventory_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Authenticated can view items" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners and managers full access to transactions" ON public.inventory_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Employees can create used and wasted transactions" ON public.inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (transaction_type IN ('used', 'wasted'));

CREATE POLICY "Authenticated can view transactions" ON public.inventory_transactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners and managers full access to documents" ON public.inventory_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role));

CREATE POLICY "Authenticated can view documents" ON public.inventory_documents
  FOR SELECT TO authenticated
  USING (true);

-- Storage bucket for inventory documents
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-documents', 'inventory-documents', false);

CREATE POLICY "Owners and managers can upload inventory docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventory-documents' AND (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role)));

CREATE POLICY "Authenticated can view inventory docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-documents');

-- Seed default inventory categories
INSERT INTO public.inventory_categories (name, sort_order) VALUES
  ('Dough & Baking', 1),
  ('Toppings & Seasonings', 2),
  ('Beverages', 3),
  ('Packaging & Supplies', 4),
  ('Cleaning Supplies', 5),
  ('Equipment & Smallwares', 6);

-- Updated_at trigger for inventory_items
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qsce_visits_updated_at
  BEFORE UPDATE ON public.qsce_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
