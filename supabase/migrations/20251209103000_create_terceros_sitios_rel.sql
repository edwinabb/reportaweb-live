-- Tabla: Terceros Sitios Rel (Junction table for Many-to-Many)
create table if not exists public.terceros_sitios_rel (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null default auth.uid (),
  sitio_id uuid not null references public.terceros_sitios(id) on delete cascade,
  tercero_id uuid not null references public.terceros(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  created_by uuid null references auth.users (id),
  constraint terceros_sitios_rel_pkey primary key (id),
  constraint terceros_sitios_rel_unique unique (sitio_id, tercero_id)
);

-- RLS Policies
alter table public.terceros_sitios_rel enable row level security;

create policy "Enable read access for tenant users" on public.terceros_sitios_rel
  for select using (auth.uid() = tenant_id);

create policy "Enable insert for tenant users" on public.terceros_sitios_rel
  for insert with check (auth.uid() = tenant_id);

create policy "Enable update for tenant users" on public.terceros_sitios_rel
  for update using (auth.uid() = tenant_id);

create policy "Enable delete for tenant users" on public.terceros_sitios_rel
  for delete using (auth.uid() = tenant_id);
