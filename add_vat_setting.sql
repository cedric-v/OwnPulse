-- Add default VAT setting (Swiss rate 8.1%, owner-scoped)
INSERT INTO settings (key, value, user_id) VALUES
('vat_rate', '8.1', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1))
ON CONFLICT (key) DO NOTHING;
