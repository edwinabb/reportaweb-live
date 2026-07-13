create table if not exists cotizaciones_matriz_actividades (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    nombre text,
    descripcion text,
    tenant_id uuid references companies(id),
    bubble_id text unique
);
alter table cotizaciones_matriz_actividades enable row level security;
create policy "Enable read access for all users" on cotizaciones_matriz_actividades for
select using (true);
create policy "Enable insert for authenticated users only" on cotizaciones_matriz_actividades for
insert with check (auth.role() = 'authenticated');
create policy "Enable update for users based on email" on cotizaciones_matriz_actividades for
update using (auth.role() = 'authenticated');
-- Add FK to Responsabilidad table if it doesn't have it explicitly defined as FK yet, or verify it.
-- We will check that later. For now, create the table.