alter table if exists public.clientes
  add column if not exists cuit text,
  add column if not exists es_propietario boolean not null default false,
  add column if not exists es_inquilino boolean not null default false,
  add column if not exists es_garante boolean not null default false;

alter table if exists public.inquilinos
  add column if not exists garante_cliente_id uuid;

update public.clientes
set cuit = cuit_empresa
where cuit is null
  and cuit_empresa is not null;

update public.clientes c
set es_propietario = true
where exists (
  select 1
  from public.propietarios p
  where p.cliente_id = c.id
);

update public.clientes c
set es_inquilino = true
where exists (
  select 1
  from public.inquilinos i
  where i.cliente_id = c.id
);

create index if not exists clientes_cuit_idx on public.clientes (cuit);
create index if not exists clientes_roles_idx on public.clientes (es_propietario, es_inquilino, es_garante);
create index if not exists propietarios_cliente_id_idx on public.propietarios (cliente_id);
create index if not exists inquilinos_cliente_id_idx on public.inquilinos (cliente_id);
create index if not exists inquilinos_garante_cliente_id_idx on public.inquilinos (garante_cliente_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'propietarios_cliente_id_fkey'
  ) then
    alter table public.propietarios
      add constraint propietarios_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inquilinos_cliente_id_fkey'
  ) then
    alter table public.inquilinos
      add constraint inquilinos_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inquilinos_garante_cliente_id_fkey'
  ) then
    alter table public.inquilinos
      add constraint inquilinos_garante_cliente_id_fkey
      foreign key (garante_cliente_id) references public.clientes(id) not valid;
  end if;
end;
$$;

create or replace function public.sync_cliente_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.es_propietario and not exists (
    select 1 from public.propietarios where cliente_id = new.id
  ) then
    insert into public.propietarios (
      cliente_id,
      dni,
      nombres,
      apellidos,
      telefono,
      email,
      direccion,
      ciudad,
      cp,
      pais,
      cuit_empresa
    )
    values (
      new.id,
      new.dni,
      new.nombres,
      new.apellidos,
      new.telefono,
      new.email,
      new.direccion,
      new.ciudad,
      new.cp,
      new.pais,
      new.cuit
    );
  elsif new.es_propietario then
    update public.propietarios
    set
      dni = new.dni,
      nombres = new.nombres,
      apellidos = new.apellidos,
      telefono = new.telefono,
      email = new.email,
      direccion = new.direccion,
      ciudad = new.ciudad,
      cp = new.cp,
      pais = new.pais,
      cuit_empresa = new.cuit
    where cliente_id = new.id;
  end if;

  if new.es_inquilino and not exists (
    select 1 from public.inquilinos where cliente_id = new.id
  ) then
    insert into public.inquilinos (
      cliente_id,
      dni,
      nombres,
      apellidos,
      telefono,
      email,
      direccion,
      ciudad,
      cp,
      pais,
      fecha_alta
    )
    values (
      new.id,
      new.dni,
      new.nombres,
      new.apellidos,
      new.telefono,
      new.email,
      new.direccion,
      new.ciudad,
      new.cp,
      new.pais,
      coalesce(new.fecha_alta, now())
    );
  elsif new.es_inquilino then
    update public.inquilinos
    set
      dni = new.dni,
      nombres = new.nombres,
      apellidos = new.apellidos,
      telefono = new.telefono,
      email = new.email,
      direccion = new.direccion,
      ciudad = new.ciudad,
      cp = new.cp,
      pais = new.pais
    where cliente_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_cliente_roles_trigger on public.clientes;
create trigger sync_cliente_roles_trigger
after insert or update of
  dni,
  nombres,
  apellidos,
  telefono,
  email,
  direccion,
  ciudad,
  cp,
  pais,
  cuit,
  es_propietario,
  es_inquilino,
  es_garante
on public.clientes
for each row execute function public.sync_cliente_roles();
