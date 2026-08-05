-- IFLP schema extras — the sections the form grew past the original
-- 20260717000000_iflp_plans.sql migration.
--
-- Three additions, all so the wizard's final "save" can persist the whole form:
--   1. Corporate Fixed Bucket "delivers" metrics — plan-level scalars, so they
--      live as columns on plans (like the success_* fields).
--   2. Projected Access to Capital — one row per milestone year (2/4/6/8/10).
--   3. Projected Annual Retirement Income — one row per income source, some
--      per-party (CPP & OAS, TFSA), the rest plan-level.
--
-- Depends on 20260717000000_iflp_plans.sql for public.plans, public.owns_plan(),
-- public.is_admin() and the plan_parties table. Run with `supabase db push`, or
-- paste into the SQL editor. Not idempotent.

-- ---------------------------------------------------------------------------
-- 1. Corporate Fixed Bucket "delivers" metrics (Step 4). Single figures for the
--    whole plan (the per-client contribution already lives in plan_accounts as
--    account_type = 'corporate_fixed'), so they attach directly to plans.
-- ---------------------------------------------------------------------------
alter table public.plans
  add column corp_fixed_annual_tax_free_income  numeric,
  add column corp_fixed_contribution_period_years integer,
  add column corp_fixed_estate_value            numeric,
  add column corp_fixed_total_lifetime_value    numeric;

-- ---------------------------------------------------------------------------
-- 2. Projected Access to Capital (Step 2). Fixed milestone years; only the
--    "Potential Capital Available" amount is entered per row. year_offset keeps
--    the 2/4/6/8/10 interval explicit so the table survives a reload.
-- ---------------------------------------------------------------------------
create table public.plan_access_to_capital (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans (id) on delete cascade,
  year_offset integer not null,
  amount      numeric,
  sort_order  integer not null default 0
);

create index plan_access_to_capital_plan_id_idx
  on public.plan_access_to_capital (plan_id);

-- ---------------------------------------------------------------------------
-- 3. Projected Annual Retirement Income (Step 3). Each source contributes an
--    annual income and an expected estate value. CPP & OAS and TFSA row per
--    client (party_id set); the personal-pension and corporate buckets are
--    plan-level (party_id null).
-- ---------------------------------------------------------------------------
create type public.retirement_income_source as enum (
  'cpp_oas', 'tfsa', 'personal_pension', 'corporate_liquid', 'corporate_fixed'
);

create table public.plan_retirement_income (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.plans (id) on delete cascade,
  source        public.retirement_income_source not null,
  party_id      uuid references public.plan_parties (id) on delete set null,
  annual_income numeric,
  estate_value  numeric,
  sort_order    integer not null default 0
);

create index plan_retirement_income_plan_id_idx
  on public.plan_retirement_income (plan_id);

-- ---------------------------------------------------------------------------
-- RLS — same uniform child-table policy as every other plan_* table: scoped
-- through the parent plan via owns_plan(), admins exempt.
-- ---------------------------------------------------------------------------
alter table public.plan_access_to_capital enable row level security;
alter table public.plan_retirement_income enable row level security;

create policy "plan_access_to_capital_all" on public.plan_access_to_capital
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_retirement_income_all" on public.plan_retirement_income
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- create_plan(payload) — persist a whole IFLP submission in one transaction.
--
-- A plpgsql function body is a single transaction: if any insert raises, every
-- insert in this call is rolled back, so a submission is all-or-nothing with no
-- orphaned plan rows. The app builds the payload (pre-generating each party's
-- UUID so child rows can carry a resolved party_id) and this function inserts it
-- verbatim, then returns the new plan id.
--
-- SECURITY INVOKER (the default, stated for emphasis): the function runs as the
-- calling user, so every insert passes through the same RLS policies the app
-- would hit directly — owner_id is forced to auth.uid() on the plan, and each
-- child is gated by owns_plan(). The just-inserted (uncommitted) plan row is
-- visible to owns_plan() within this same transaction, so the children pass.
--
-- Shapes below mirror the row builders in src/lib/iflp-persist.ts; keep them in
-- lockstep. Every array key is coalesced to '[]' so an absent section is a no-op.
-- ---------------------------------------------------------------------------
create function public.create_plan(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
begin
  insert into public.plans (
    owner_id, plan_month, plan_year, household_income, priorities,
    target_independence_age, success_retirement_income, success_passive_income,
    success_liquid_capital, success_net_worth,
    corp_fixed_annual_tax_free_income, corp_fixed_contribution_period_years,
    corp_fixed_estate_value, corp_fixed_total_lifetime_value
  )
  select
    auth.uid(), p.plan_month, p.plan_year, p.household_income,
    coalesce(p.priorities, '{}'),
    p.target_independence_age, p.success_retirement_income, p.success_passive_income,
    p.success_liquid_capital, p.success_net_worth,
    p.corp_fixed_annual_tax_free_income, p.corp_fixed_contribution_period_years,
    p.corp_fixed_estate_value, p.corp_fixed_total_lifetime_value
  from jsonb_to_record(payload->'plan') as p(
    plan_month text, plan_year integer, household_income numeric, priorities text[],
    target_independence_age integer, success_retirement_income text,
    success_passive_income text, success_liquid_capital text, success_net_worth text,
    corp_fixed_annual_tax_free_income numeric, corp_fixed_contribution_period_years integer,
    corp_fixed_estate_value numeric, corp_fixed_total_lifetime_value numeric
  )
  returning id into v_plan_id;

  insert into public.plan_parties (id, plan_id, party_type, display_name, first_name, last_name, age, sort_order)
  select r.id, v_plan_id, r.party_type, r.display_name, r.first_name, r.last_name, r.age, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'parties', '[]'::jsonb)) as r(
    id uuid, party_type public.party_type, display_name text, first_name text,
    last_name text, age integer, sort_order integer
  );

  insert into public.plan_children (plan_id, name, education_cost, education_years_away, sort_order)
  select v_plan_id, r.name, r.education_cost, r.education_years_away, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'children', '[]'::jsonb)) as r(
    name text, education_cost numeric, education_years_away integer, sort_order integer
  );

  insert into public.plan_retirement_buckets (plan_id, contribution, annual_value, sort_order)
  select v_plan_id, r.contribution, r.annual_value, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'retirement_buckets', '[]'::jsonb)) as r(
    contribution numeric, annual_value numeric, sort_order integer
  );

  insert into public.plan_monthly_savings (plan_id, label, amount, sort_order)
  select v_plan_id, r.label, r.amount, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'monthly_savings', '[]'::jsonb)) as r(
    label text, amount numeric, sort_order integer
  );

  insert into public.plan_income_alignment (plan_id, party_id, amount, sort_order)
  select v_plan_id, r.party_id, r.amount, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'income_alignment', '[]'::jsonb)) as r(
    party_id uuid, amount numeric, sort_order integer
  );

  insert into public.plan_government_benefits (plan_id, party_id, cpp_amount, oas_amount, sort_order)
  select v_plan_id, r.party_id, r.cpp_amount, r.oas_amount, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'government_benefits', '[]'::jsonb)) as r(
    party_id uuid, cpp_amount numeric, oas_amount numeric, sort_order integer
  );

  insert into public.plan_accounts (plan_id, account_type, party_id, contribution, contribution_frequency, estimated_value, sort_order)
  select v_plan_id, r.account_type, r.party_id, r.contribution, r.contribution_frequency, r.estimated_value, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'accounts', '[]'::jsonb)) as r(
    account_type public.account_type, party_id uuid, contribution numeric,
    contribution_frequency public.contribution_frequency, estimated_value numeric, sort_order integer
  );

  insert into public.plan_insurance (plan_id, insurance_type, party_id, amount, modifier, sort_order)
  select v_plan_id, r.insurance_type, r.party_id, r.amount, r.modifier, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'insurance', '[]'::jsonb)) as r(
    insurance_type public.insurance_type, party_id uuid, amount numeric, modifier text, sort_order integer
  );

  insert into public.plan_account_transfers (plan_id, account_scope, party_id, institution, account, transfer_method, expected_time, sort_order)
  select v_plan_id, r.account_scope, r.party_id, r.institution, r.account, r.transfer_method, r.expected_time, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'account_transfers', '[]'::jsonb)) as r(
    account_scope public.account_scope, party_id uuid, institution text, account text,
    transfer_method public.transfer_method, expected_time text, sort_order integer
  );

  insert into public.plan_funding (plan_id, funding_kind, account_scope, party_id, amount, funding_bucket, sort_order)
  select v_plan_id, r.funding_kind, r.account_scope, r.party_id, r.amount, r.funding_bucket, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'funding', '[]'::jsonb)) as r(
    funding_kind public.funding_kind, account_scope public.account_scope, party_id uuid,
    amount numeric, funding_bucket text, sort_order integer
  );

  insert into public.plan_access_to_capital (plan_id, year_offset, amount, sort_order)
  select v_plan_id, r.year_offset, r.amount, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'access_to_capital', '[]'::jsonb)) as r(
    year_offset integer, amount numeric, sort_order integer
  );

  insert into public.plan_retirement_income (plan_id, source, party_id, annual_income, estate_value, sort_order)
  select v_plan_id, r.source, r.party_id, r.annual_income, r.estate_value, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'retirement_income', '[]'::jsonb)) as r(
    source public.retirement_income_source, party_id uuid, annual_income numeric,
    estate_value numeric, sort_order integer
  );

  return v_plan_id;
end;
$$;

revoke execute on function public.create_plan(jsonb) from public;
grant execute on function public.create_plan(jsonb) to authenticated;
