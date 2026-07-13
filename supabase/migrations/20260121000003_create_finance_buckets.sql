-- Create Storage Buckets for Finance Files
INSERT INTO storage.buckets (id, name, public)
VALUES ('facturas_compras', 'facturas_compras', true),
    ('facturas_ventas', 'facturas_ventas', true) ON CONFLICT (id) DO NOTHING;
-- Optional: Set up policies if needed (allowing public read, authenticated insert)
-- For now, we assume the service_role key will be used for migration, effectively bypassing RLS.
-- But for the app to read them, we need public access or policies.
-- 'public: true' above handles public read if the bucket is public.
-- To allow authenticated users to upload (if needed later):
/*
 CREATE POLICY "Authenticated users can upload"
 ON storage.objects FOR INSERT
 TO authenticated
 WITH CHECK ( bucket_id IN ('facturas_compras', 'facturas_ventas') );
 */