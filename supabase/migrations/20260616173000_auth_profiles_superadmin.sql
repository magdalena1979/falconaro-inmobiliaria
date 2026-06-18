create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_check check (role in ('superadmin', 'admin', 'user'))
);

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'superadmin'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when lower(new.email) = 'magdalenabelaustegui@gmail.com' then 'superadmin'
      else 'user'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        role = case
          when lower(excluded.email) = 'magdalenabelaustegui@gmail.com' then 'superadmin'
          else public.user_profiles.role
        end,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.user_profiles (id, email, role)
select
  id,
  email,
  case
    when lower(email) = 'magdalenabelaustegui@gmail.com' then 'superadmin'
    else 'user'
  end
from auth.users
on conflict (id) do update
  set email = excluded.email,
      role = case
        when lower(excluded.email) = 'magdalenabelaustegui@gmail.com' then 'superadmin'
        else public.user_profiles.role
      end,
      updated_at = now();

alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_select'
  ) then
    create policy user_profiles_select
      on public.user_profiles
      for select
      to authenticated
      using (id = auth.uid() or public.is_superadmin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_update'
  ) then
    create policy user_profiles_update
      on public.user_profiles
      for update
      to authenticated
      using (id = auth.uid() or public.is_superadmin())
      with check (id = auth.uid() or public.is_superadmin());
  end if;
end;
$$;
