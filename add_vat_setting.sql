-- Add default VAT setting (Swiss rate 8.1%)
INSERT INTO settings (key, value) VALUES ('vat_rate', '8.1')
ON CONFLICT (key) DO NOTHING;
