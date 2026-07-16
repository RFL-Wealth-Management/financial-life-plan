-- Splits authenticated users into 'admin' and 'user', and records document
-- ownership so access can be scoped per user.
--
-- Run against a fresh project with `supabase db push`, or paste into the
-- SQL editor in the Supabase dashboard. Safe to run once; not idempotent.

create type public.user_role as enum ('admin', 'user');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users row, created automatically by handle_new_user().';

-- Every generated plan belongs to whoever generated it. The id matches the
-- filename written to output/{id}.docx by docx-service.
create table public.documents (
  id           uuid primary key,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  client1_name text not null,
  client2_name text,
  created_at   timestamptz not null default now()
);

create index documents_owner_id_created_at_idx
  on public.documents (owner_id, created_at desc);

alter table public.profiles  enable row level security;
alter table public.documents enable row level security;

-- Role lookup used by the policies below.
--
-- SECURITY DEFINER is load-bearing: this runs as the function owner, so it is
-- exempt from RLS. A policy on `profiles` that inlined `select ... from
-- profiles` would re-trigger that same policy and recurse forever. Routing the
-- lookup through a definer function breaks the cycle.
--
-- `set search_path` pins resolution to known schemas so the definer privilege
-- cannot be hijacked by a caller-controlled search_path.
create function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- profiles: everyone reads their own row; admins read every row.
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_admin" on public.profiles
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- Only admins may change a row, and only admins may leave one behind. Note
-- there is deliberately no INSERT policy: rows arrive solely via the
-- handle_new_user() trigger, so a user cannot fabricate their own profile.
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- documents: you see what you generated; admins see everything.
create policy "documents_select_own" on public.documents
  for select to authenticated
  using (auth.uid() = owner_id);

create policy "documents_select_admin" on public.documents
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- with check prevents inserting a row owned by someone else.
create policy "documents_insert_own" on public.documents
  for insert to authenticated
  with check (auth.uid() = owner_id);

-- New signups land as 'user'. Privilege is granted deliberately, never by
-- default.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- The trigger only fires on future signups, so adopt the users that already
-- exist. They all become 'user'; promote the first admin explicitly below.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- BOOTSTRAP: there is no admin until you create one, and the RLS policies
-- above mean no admin can be created through the app. Uncomment, set the
-- address, and run once.
--
-- update public.profiles set role = 'admin' where email = 'you@example.com';
