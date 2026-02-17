-- Add Social Contributions and Taxes settings
INSERT INTO settings (key, value) VALUES 
('social_rate', '20'),
('tax_rate', '3')
ON CONFLICT (key) DO NOTHING;
