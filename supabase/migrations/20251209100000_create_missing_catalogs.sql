-- Create personal_cargos table
create table if not exists public.personal_cargos (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null default auth.uid (),
  nombre text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references auth.users (id),
  updated_by uuid null references auth.users (id),
  constraint personal_cargos_pkey primary key (id)
);

-- Create sitios_tipo table
create table if not exists public.sitios_tipo (
  id uuid not null default gen_random_uuid (),
  tenant_id uuid not null default auth.uid (),
  nombre text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null references auth.users (id),
  updated_by uuid null references auth.users (id),
  constraint sitios_tipo_pkey primary key (id)
);

-- Enable RLS
alter table public.personal_cargos enable row level security;
alter table public.sitios_tipo enable row level security;

-- Policies for personal_cargos
create policy "Enable read access for tenant users" on public.personal_cargos
  for select using (auth.uid() = tenant_id);

create policy "Enable insert for tenant users" on public.personal_cargos
  for insert with check (auth.uid() = tenant_id);

create policy "Enable update for tenant users" on public.personal_cargos
  for update using (auth.uid() = tenant_id);

create policy "Enable delete for tenant users" on public.personal_cargos
  for delete using (auth.uid() = tenant_id);

-- Policies for sitios_tipo
create policy "Enable read access for tenant users" on public.sitios_tipo
  for select using (auth.uid() = tenant_id);

create policy "Enable insert for tenant users" on public.sitios_tipo
  for insert with check (auth.uid() = tenant_id);

create policy "Enable update for tenant users" on public.sitios_tipo
  for update using (auth.uid() = tenant_id);

create policy "Enable delete for tenant users" on public.sitios_tipo
  for delete using (auth.uid() = tenant_id);
