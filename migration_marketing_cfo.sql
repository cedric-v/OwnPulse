-- Add Marketing fields to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS customer_conversion_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS offers_purchased JSONB DEFAULT '[]'::JSONB;

-- Create sales table (financial data — owner-scoped)
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_name TEXT NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    price_ht NUMERIC NOT NULL,
    vat_rate NUMERIC NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    payment_terms TEXT,
    payment_delay TEXT,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated, service_role;

-- Create expenses table (financial data — owner-scoped)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    importance TEXT CHECK (importance IN ('Mandatory', 'Important', 'Optional')),
    price_ht NUMERIC NOT NULL,
    vat_rate NUMERIC NOT NULL DEFAULT 0,
    payment_frequency TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated, service_role;

-- RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Owner-scoped policies (idempotent; drops legacy "for all users" policies)
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sales;
DROP POLICY IF EXISTS "Enable update access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;
DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable update access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expenses;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales' AND policyname = 'owner_full_access') THEN
        CREATE POLICY "owner_full_access" ON sales FOR ALL TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'owner_full_access') THEN
        CREATE POLICY "owner_full_access" ON expenses FOR ALL TO authenticated
            USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
END $$;
