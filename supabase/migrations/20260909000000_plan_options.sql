-- Plan-level switches: which accounts and buckets appear in the generated IFLP.
--
-- RFL asked for a Yes/No selection per savings account (and per pension bucket)
-- that decides whether the account's page is included in the final document.
-- That is at least six flags today (TFSA, RRSP, FHSA, Non-Registered, pension
-- include, pension type) and more will follow as sections become optional.
--
-- Storing them as one jsonb blob rather than a column each is a deliberate
-- trade. A scalar column per flag costs a full re-declaration of create_plan()
-- and update_plan() EVERY time a flag is added, because both hand-enumerate the
-- plans column list. The blob costs that once. The precedent is plan_fflp.data
-- (20260818020000_fflp_jsonb.sql), added for the same reason.
--
-- The shape is owned by the app (IflpFormState.planOptions in
-- src/lib/iflp-form.ts) and is intentionally NOT constrained here: these are
-- presentation switches, never joined on or aggregated. A flag absent from the
-- blob reads as its app-side default, so old plans load unchanged.
--
-- insert_plan_children() is NOT re-declared — this is a column on plans, not a
-- child table. Only the two functions that write the plan row change, and each
-- body is otherwise identical to the definition it replaces (20260804010000 for
-- create_plan, 20260904000000 for update_plan).
--
-- Depends on 20260904000000_other_priorities.sql.
-- Run with `supabase db push`. Not idempotent.

-- ---------------------------------------------------------------------------
-- Column
-- ---------------------------------------------------------------------------
alter table public.plans
  add column options jsonb not null default '{}'::jsonb;

comment on column public.plans.options is
  'Document inclusion switches (account Yes/No, pension bucket + type). Shape owned by IflpFormState.planOptions; an absent key means the app default.';

-- ---------------------------------------------------------------------------
-- create_plan() — re-declared to carry plans.options.
-- ---------------------------------------------------------------------------
create or replace function public.create_plan(payload jsonb)
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
    corp_fixed_estate_value, corp_fixed_total_lifetime_value,
    options
  )
  select
    auth.uid(), p.plan_month, p.plan_year, p.household_income,
    coalesce(p.priorities, '{}'),
    p.target_independence_age, p.success_retirement_income, p.success_passive_income,
    p.success_liquid_capital, p.success_net_worth,
    p.corp_fixed_annual_tax_free_income, p.corp_fixed_contribution_period_years,
    p.corp_fixed_estate_value, p.corp_fixed_total_lifetime_value,
    coalesce(p.options, '{}'::jsonb)
  from jsonb_to_record(payload->'plan') as p(
    plan_month text, plan_year integer, household_income numeric, priorities text[],
    target_independence_age integer, success_retirement_income text,
    success_passive_income text, success_liquid_capital text, success_net_worth text,
    corp_fixed_annual_tax_free_income numeric, corp_fixed_contribution_period_years integer,
    corp_fixed_estate_value numeric, corp_fixed_total_lifetime_value numeric,
    options jsonb
  )
  returning id into v_plan_id;

  perform public.insert_plan_children(v_plan_id, payload);
  return v_plan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_plan() — re-declared for the same column. Delete list unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.update_plan(p_plan_id uuid, payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
begin
  update public.plans p set
    plan_month = x.plan_month,
    plan_year = x.plan_year,
    household_income = x.household_income,
    priorities = coalesce(x.priorities, '{}'),
    target_independence_age = x.target_independence_age,
    success_retirement_income = x.success_retirement_income,
    success_passive_income = x.success_passive_income,
    success_liquid_capital = x.success_liquid_capital,
    success_net_worth = x.success_net_worth,
    corp_fixed_annual_tax_free_income = x.corp_fixed_annual_tax_free_income,
    corp_fixed_contribution_period_years = x.corp_fixed_contribution_period_years,
    corp_fixed_estate_value = x.corp_fixed_estate_value,
    corp_fixed_total_lifetime_value = x.corp_fixed_total_lifetime_value,
    options = coalesce(x.options, '{}'::jsonb)
  from jsonb_to_record(payload->'plan') as x(
    plan_month text, plan_year integer, household_income numeric, priorities text[],
    target_independence_age integer, success_retirement_income text,
    success_passive_income text, success_liquid_capital text, success_net_worth text,
    corp_fixed_annual_tax_free_income numeric, corp_fixed_contribution_period_years integer,
    corp_fixed_estate_value numeric, corp_fixed_total_lifetime_value numeric,
    options jsonb
  )
  where p.id = p_plan_id
  returning p.id into v_plan_id;

  if v_plan_id is null then
    raise exception 'Plan % not found or not permitted', p_plan_id
      using errcode = 'no_data_found';
  end if;

  -- Clear every child row, then rebuild from the payload. The parties' UUIDs are
  -- regenerated by the caller each save, so deleting and re-inserting keeps the
  -- child party_id references internally consistent.
  delete from public.plan_children            where plan_id = v_plan_id;
  delete from public.plan_other_priorities    where plan_id = v_plan_id;
  delete from public.plan_retirement_buckets  where plan_id = v_plan_id;
  delete from public.plan_monthly_savings     where plan_id = v_plan_id;
  delete from public.plan_income_alignment    where plan_id = v_plan_id;
  delete from public.plan_government_benefits  where plan_id = v_plan_id;
  delete from public.plan_accounts            where plan_id = v_plan_id;
  delete from public.plan_insurance           where plan_id = v_plan_id;
  delete from public.plan_account_transfers   where plan_id = v_plan_id;
  delete from public.plan_funding             where plan_id = v_plan_id;
  delete from public.plan_access_to_capital   where plan_id = v_plan_id;
  delete from public.plan_retirement_income   where plan_id = v_plan_id;
  delete from public.plan_parties             where plan_id = v_plan_id;

  perform public.insert_plan_children(v_plan_id, payload);
  return v_plan_id;
end;
$$;
