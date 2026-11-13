

-- RECOCARE DATABASE SETUP
-- Supabase PostgreSQL

create extension if not exists pgcrypto;

-- 1. User profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'patient'
    check (role in ('patient', 'provider', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. Healthcare services
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.services (name, description)
values
  ('Home Nursing', 'Qualified home nursing services'),
  ('Physiotherapy', 'Physiotherapy at home'),
  ('Post-operative Care', 'Recovery and post-operative support'),
  ('Medical Equipment', 'Medical equipment rental and supply')
on conflict (name) do nothing;

-- 3. Healthcare providers
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  qualification text,
  experience_years integer default 0,
  service_area text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- 4. Patient bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  provider_id uuid references public.providers(id),
  service_id uuid not null references public.services(id),
  locality text,
  requested_date date,
  requested_time text,
  patient_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 5. Automatically create a profile at signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case
      when new.raw_user_meta_data ->> 'role' in ('patient', 'provider')
      then new.raw_user_meta_data ->> 'role'
      else 'patient'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 6. Admin verification helper
create or replace function public.is_recocare_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- 7. Enable row-level security
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.providers enable row level security;
alter table public.bookings enable row level security;

-- Profiles
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_recocare_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_recocare_admin())
with check (public.is_recocare_admin());

-- Services
drop policy if exists "Anyone can view active services" on public.services;
create policy "Anyone can view active services"
on public.services for select
to anon, authenticated
using (active = true or public.is_recocare_admin());

drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services"
on public.services for all
to authenticated
using (public.is_recocare_admin())
with check (public.is_recocare_admin());

-- Providers
drop policy if exists "View approved providers" on public.providers;
create policy "View approved providers"
on public.providers for select
to anon, authenticated
using (verification_status = 'approved'
  or user_id = (select auth.uid())
  or public.is_recocare_admin());

drop policy if exists "Providers submit applications" on public.providers;
create policy "Providers submit applications"
on public.providers for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and verification_status = 'pending'
);

drop policy if exists "Admins manage providers" on public.providers;
create policy "Admins manage providers"
on public.providers for all
to authenticated
using (public.is_recocare_admin())
with check (public.is_recocare_admin());

-- Bookings
drop policy if exists "Patients view own bookings" on public.bookings;
create policy "Patients view own bookings"
on public.bookings for select
to authenticated
using (
  patient_id = (select auth.uid())
  or public.is_recocare_admin()
  or exists (
    select 1 from public.providers p
    where p.id = provider_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Patients create bookings" on public.bookings;
create policy "Patients create bookings"
on public.bookings for insert
to authenticated
with check (
  patient_id = (select auth.uid())
  and status = 'pending'
);

drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings"
on public.bookings for all
to authenticated
using (public.is_recocare_admin())
with check (public.is_recocare_admin());

-- Allow assigned providers to update booking status
drop policy if exists "Assigned providers update bookings" on public.bookings;
create policy "Assigned providers update bookings"
on public.bookings for update
to authenticated
using (
  exists (
    select 1 from public.providers p
    where p.id = provider_id
      and p.user_id = (select auth.uid())
      and p.verification_status = 'approved'
  )
)
with check (
  exists (
    select 1 from public.providers p
    where p.id = provider_id
      and p.user_id = (select auth.uid())
      and p.verification_status = 'approved'
  )
);

-- Performance indexes
create index if not exists bookings_patient_id_idx
on public.bookings(patient_id);

create index if not exists bookings_provider_id_idx
on public.bookings(provider_id);

create index if not exists bookings_status_idx
on public.bookings(status);

create index if not exists providers_user_id_idx
on public.providers(user_id);
