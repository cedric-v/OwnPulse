-- Add Social Contributions and Taxes settings (owner-scoped)
INSERT INTO settings (key, value, user_id) VALUES
('social_rate', '20', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
('tax_rate', '3', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1))
ON CONFLICT (key) DO NOTHING;
