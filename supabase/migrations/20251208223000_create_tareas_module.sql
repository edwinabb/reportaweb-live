-- Create Tareas table
create table public.tareas (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  titulo text not null,
  descripcion text,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA')),
  prioridad text not null default 'MEDIA' check (prioridad in ('ALTA', 'MEDIA', 'BAJA')),
  fecha_vencimiento date,
  
  cliente_id uuid references public.terceros(id),
  cotizacion_id uuid references public.cotizaciones(id),
  asignado_a uuid references auth.users(id),
  
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),

  constraint tareas_pkey primary key (id)
);

-- Create Tareas Comentarios table
create table public.tareas_comentarios (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  tarea_id uuid not null references public.tareas(id),
  comentario text not null,
  
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id),

  constraint tareas_comentarios_pkey primary key (id)
);

-- Enable RLS
alter table public.tareas enable row level security;
alter table public.tareas_comentarios enable row level security;

-- Policies for Tareas
create policy "Enable read access for tenant users" on public.tareas
  for select using (auth.uid() in (
    select id from profiles where tenant_id = tareas.tenant_id
  ));

create policy "Enable insert access for tenant users" on public.tareas
  for insert with check (auth.uid() in (
    select id from profiles where tenant_id = tareas.tenant_id
  ));

create policy "Enable update access for tenant users" on public.tareas
  for update using (auth.uid() in (
    select id from profiles where tenant_id = tareas.tenant_id
  ));

-- Policies for Tareas Comentarios
create policy "Enable read access for tenant users" on public.tareas_comentarios
  for select using (auth.uid() in (
    select id from profiles where tenant_id = tareas_comentarios.tenant_id
  ));

create policy "Enable insert access for tenant users" on public.tareas_comentarios
  for insert with check (auth.uid() in (
    select id from profiles where tenant_id = tareas_comentarios.tenant_id
  ));

-- Indexes
create index idx_tareas_tenant on public.tareas(tenant_id);
create index idx_tareas_cliente on public.tareas(cliente_id);
create index idx_tareas_cotizacion on public.tareas(cotizacion_id);
create index idx_tareas_asignado on public.tareas(asignado_a);
create index idx_tareas_comentarios_tarea on public.tareas_comentarios(tarea_id);
