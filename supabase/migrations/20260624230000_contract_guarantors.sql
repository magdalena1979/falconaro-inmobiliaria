create table if not exists public.contrato_garantes (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  garante_cliente_id uuid not null references public.clientes(id),
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_garantes_unique unique (contrato_id, garante_cliente_id)
);

create index if not exists contrato_garantes_contrato_id_idx
  on public.contrato_garantes (contrato_id);

create index if not exists contrato_garantes_cliente_id_idx
  on public.contrato_garantes (garante_cliente_id);

alter table public.contrato_garantes enable row level security;

drop policy if exists contrato_garantes_admin_crud on public.contrato_garantes;
create policy contrato_garantes_admin_crud
  on public.contrato_garantes
  for all
  to authenticated
  using (public.is_admin_or_superadmin())
  with check (public.is_admin_or_superadmin());
