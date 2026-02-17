-- Add Marketing fields to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS customer_conversion_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS offers_purchased JSONB DEFAULT '[]'::JSONB;

-- Create sales table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    importance TEXT CHECK (importance IN ('Mandatory', 'Important', 'Optional')),
    price_ht NUMERIC NOT NULL,
    vat_rate NUMERIC NOT NULL DEFAULT 0,
    payment_frequency TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies (simple public/anon access for now as per project style)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sales FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expenses FOR DELETE USING (true);
