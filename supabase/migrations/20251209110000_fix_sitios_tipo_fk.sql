-- Fix sitios tipo column
-- 1. Alter column to UUID (assuming data is clean or nullable)
-- 2. Add foreign key to sitios_tipo

do $$
begin
  -- Check if column type is text
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'terceros_sitios' and column_name = 'tipo' and data_type = 'text') then
    -- Attempt to cast. If fails, it means incompatible data exists.
    -- We'll try to convert valid UUIDs and set others to NULL to be safe.
    alter table public.terceros_sitios 
      alter column tipo type uuid using (
        case when tipo ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        then tipo::uuid 
        else null 
        end
      );
  end if;
end $$;

-- Add FK if not exists
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'terceros_sitios_tipo_fkey') then
    alter table public.terceros_sitios
      add constraint terceros_sitios_tipo_fkey
      foreign key (tipo)
      references public.sitios_tipo(id); -- No cascade delete to be safe, or set null?
  end if;
end $$;
