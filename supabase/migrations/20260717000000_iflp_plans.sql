-- IFLP persistence schema.
--
-- One `plans` row per Initial Financial Life Plan, plus child tables for the
-- repeating sections of the document (accounts, insurance, transfers, ...).
-- Everything a user can generate belongs to that user via plans.owner_id, and
-- RLS scopes every child through its parent plan.
--
-- FFLP is deliberately absent: no plan_type, no FFLP columns. It is a separate,
-- later change.
--
-- Depends on 20260716000000_roles_and_documents.sql for public.is_admin() and
-- public.touch_updated_at(). Run with `supabase db push`, or paste into the SQL
-- editor. Not idempotent.

-- ---------------------------------------------------------------------------
-- Enums — closed sets only. Fields whose option lists are not yet known
-- (funding buckets, transfer account types, insurance products/terms) are
-- plain text columns below, to be constrained once those lists arrive.
-- ---------------------------------------------------------------------------
create type public.party_type             as enum ('client', 'corporation');
create type public.account_scope          as enum ('personal', 'corporate');
create type public.transfer_method        as enum ('in_kind', 'in_cash');
create type public.insurance_type         as enum ('term_life', 'critical_illness', 'disability');
create type public.account_type           as enum ('tfsa', 'rrsp', 'ppp', 'corporate_liquid', 'corporate_fixed');
create type public.contribution_frequency as enum ('monthly', 'annual');
create type public.funding_kind           as enum ('lump_sum', 'monthly');

-- ---------------------------------------------------------------------------
-- Root: one row per IFLP.
-- ---------------------------------------------------------------------------
create table public.plans (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null references auth.users (id) on delete cascade,

  -- Cover / metadata
  plan_month                text,
  plan_year                 integer,

  -- Profile
  household_income          numeric,
  priorities                text[] not null default '{}',

  -- Your Priorities
  target_independence_age   integer,

  -- What Success Looks Like (free-text prose in the template, not currency)
  success_retirement_income text,
  success_passive_income    text,
  success_liquid_capital    text,
  success_net_worth         text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index plans_owner_id_created_at_idx
  on public.plans (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Parties: clients AND the corporation (MPC) live here as rows. Every table
-- that references a "who" points at plan_parties, so the party dropdown is a
-- query against this table, not a hardcoded enum.
-- ---------------------------------------------------------------------------
create table public.plan_parties (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.plans (id) on delete cascade,
  party_type   public.party_type not null,
  display_name text not null,             -- "John Smith" or "MPC Holdings"
  first_name   text,                      -- null for the corporation
  last_name    text,                      -- null for the corporation
  age          integer,                   -- clients only; Client 2's is optional
  sort_order   integer not null default 0
);

create index plan_parties_plan_id_idx on public.plan_parties (plan_id);

-- Children: name from "Your Priorities" merged with the education funding
-- fields. Totals are computed in the form, not stored.
create table public.plan_children (
  id                   uuid primary key default gen_random_uuid(),
  plan_id              uuid not null references public.plans (id) on delete cascade,
  name                 text,
  education_cost       numeric,
  education_years_away integer,
  sort_order           integer not null default 0
);

create index plan_children_plan_id_idx on public.plan_children (plan_id);

-- Retirement Buckets: five rows, each a contribution and an annual value.
create table public.plan_retirement_buckets (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.plans (id) on delete cascade,
  contribution numeric,
  annual_value numeric,
  sort_order   integer not null default 0
);

create index plan_retirement_buckets_plan_id_idx on public.plan_retirement_buckets (plan_id);

-- Monthly Savings Allocation: labelled currency rows. Total is computed.
create table public.plan_monthly_savings (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  label      text,
  amount     numeric,
  sort_order integer not null default 0
);

create index plan_monthly_savings_plan_id_idx on public.plan_monthly_savings (plan_id);

-- Income Alignment Strategy: party + amount per row.
create table public.plan_income_alignment (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  party_id   uuid references public.plan_parties (id) on delete set null,
  amount     numeric,
  sort_order integer not null default 0
);

create index plan_income_alignment_plan_id_idx on public.plan_income_alignment (plan_id);

-- Government Retirement Benefits: CPP and OAS per party.
create table public.plan_government_benefits (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  party_id   uuid references public.plan_parties (id) on delete set null,
  cpp_amount numeric,
  oas_amount numeric,
  sort_order integer not null default 0
);

create index plan_government_benefits_plan_id_idx on public.plan_government_benefits (plan_id);

-- Registered & corporate accounts: TFSA, RRSP, PPP, Corporate Liquid, Corporate
-- Fixed all fold in here. estimated_value is nullable because Corporate Fixed
-- has no such column; contribution_frequency captures the monthly-vs-annual
-- split (Corporate Liquid is monthly, the rest annual).
create table public.plan_accounts (
  id                     uuid primary key default gen_random_uuid(),
  plan_id                uuid not null references public.plans (id) on delete cascade,
  account_type           public.account_type not null,
  party_id               uuid references public.plan_parties (id) on delete set null,
  contribution           numeric,
  contribution_frequency public.contribution_frequency,
  estimated_value        numeric,
  sort_order             integer not null default 0
);

create index plan_accounts_plan_id_idx on public.plan_accounts (plan_id);

-- Insurance: Term Life, Critical Illness, Disability fold in here. `modifier`
-- holds the type-specific third column (term length / product / benefit term)
-- as free text until those option lists are known.
create table public.plan_insurance (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.plans (id) on delete cascade,
  insurance_type public.insurance_type not null,
  party_id       uuid references public.plan_parties (id) on delete set null,
  amount         numeric,
  modifier       text,
  sort_order     integer not null default 0
);

create index plan_insurance_plan_id_idx on public.plan_insurance (plan_id);

-- Account Transfers: personal + corporate, distinguished by account_scope.
-- `account` and `expected_time` are free text for now.
create table public.plan_account_transfers (
  id              uuid primary key default gen_random_uuid(),
  plan_id         uuid not null references public.plans (id) on delete cascade,
  account_scope   public.account_scope not null,
  party_id        uuid references public.plan_parties (id) on delete set null,
  institution     text,
  account         text,
  transfer_method public.transfer_method,
  expected_time   text,
  sort_order      integer not null default 0
);

create index plan_account_transfers_plan_id_idx on public.plan_account_transfers (plan_id);

-- Funding: lump-sum + monthly, personal + corporate — four template tables fold
-- in here via funding_kind + account_scope. funding_bucket is free text.
create table public.plan_funding (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.plans (id) on delete cascade,
  funding_kind  public.funding_kind not null,
  account_scope public.account_scope not null,
  party_id      uuid references public.plan_parties (id) on delete set null,
  amount        numeric,
  funding_bucket text,
  sort_order    integer not null default 0
);

create index plan_funding_plan_id_idx on public.plan_funding (plan_id);

-- ---------------------------------------------------------------------------
-- Ownership helper. Mirrors is_admin(): SECURITY DEFINER so it runs exempt from
-- RLS, and a pinned search_path so the definer privilege cannot be hijacked.
-- Child-table policies route through this instead of inlining a subquery, which
-- keeps every policy identical and avoids re-evaluating plans' RLS per row.
-- ---------------------------------------------------------------------------
create function public.owns_plan(pid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.plans
    where id = pid and owner_id = auth.uid()
  );
$$;

revoke execute on function public.owns_plan(uuid) from public;
grant execute on function public.owns_plan(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS. plans is scoped by owner_id (or admin); every child is scoped through
-- its parent plan via owns_plan(). Enable on all tables first.
-- ---------------------------------------------------------------------------
alter table public.plans                    enable row level security;
alter table public.plan_parties             enable row level security;
alter table public.plan_children            enable row level security;
alter table public.plan_retirement_buckets  enable row level security;
alter table public.plan_monthly_savings     enable row level security;
alter table public.plan_income_alignment    enable row level security;
alter table public.plan_government_benefits  enable row level security;
alter table public.plan_accounts            enable row level security;
alter table public.plan_insurance           enable row level security;
alter table public.plan_account_transfers   enable row level security;
alter table public.plan_funding             enable row level security;

-- plans: full CRUD for the owner; admins see and manage everything.
create policy "plans_select" on public.plans
  for select to authenticated
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

create policy "plans_insert" on public.plans
  for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "plans_update" on public.plans
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin(auth.uid()))
  with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

create policy "plans_delete" on public.plans
  for delete to authenticated
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

-- Child tables: one uniform policy set, applied identically to each table.
-- using() gates read/update/delete; with check() gates insert/update and,
-- critically, stops a user attaching a row to someone else's plan.
create policy "plan_parties_all" on public.plan_parties
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_children_all" on public.plan_children
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_retirement_buckets_all" on public.plan_retirement_buckets
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_monthly_savings_all" on public.plan_monthly_savings
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_income_alignment_all" on public.plan_income_alignment
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_government_benefits_all" on public.plan_government_benefits
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_accounts_all" on public.plan_accounts
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_insurance_all" on public.plan_insurance
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_account_transfers_all" on public.plan_account_transfers
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_funding_all" on public.plan_funding
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Keep plans.updated_at fresh, reusing the trigger function from the roles
-- migration. Child rows carry no updated_at, so no trigger there.
-- ---------------------------------------------------------------------------
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();
