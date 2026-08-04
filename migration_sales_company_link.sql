-- Link sales to companies (B2B sales)
-- Adds company_id to the sales table so a sale can be attached directly to a
-- company (in addition to the optional contact_id). The extension/dashboard
-- access model is unchanged: only the authenticated owner role can read/write
-- sales (owner-scoped RLS on user_id), and no new GRANT is required since the
-- table-level grants already cover the new column.

ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Optional helpful index for the company detail page queries
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales (company_id);

-- Quick check that the column exists and is exposed to the Data API role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'company_id'
    ) THEN
        RAISE EXCEPTION 'company_id column was not added to sales';
    END IF;
END $$;
