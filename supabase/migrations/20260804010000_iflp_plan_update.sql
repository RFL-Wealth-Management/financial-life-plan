-- Editing support: an atomic update_plan() to sit alongside create_plan().
--
-- create_plan()'s child inserts are factored out into insert_plan_children() so
-- both create and update share one definition. update_plan() replaces a plan's
-- data in place: it updates the plans row, deletes every child row, then re-runs
-- the shared inserts — all in one transaction, so an edit is as all-or-nothing
-- as a create, and a mid-way failure leaves the prior data untouched.
--
-- Depends on 20260804000000_iflp_plan_extras.sql (create_plan, the tables/enums).
-- Run with `supabase db push`. Not idempotent.

-- ---------------------------------------------------------------------------
-- Shared child inserts. SECURITY INVOKER like its callers, so every insert
-- still passes through RLS as the calling user; the parent plan row already
-- exists when this runs, so owns_plan() succeeds for each child.
-- ---------------------------------------------------------------------------
create function public.insert_plan_children(v_plan_id uuid, payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
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
end;
$$;

revoke execute on function public.insert_plan_children(uuid, jsonb) from public;
grant execute on function public.insert_plan_children(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- create_plan() now delegates its child inserts to insert_plan_children().
-- Behaviour is unchanged; only the body is refactored.
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

  perform public.insert_plan_children(v_plan_id, payload);
  return v_plan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_plan() — replace a plan's data in place, atomically. RLS makes a plan
-- the caller doesn't own invisible to the UPDATE, so v_plan_id comes back null
-- and we raise rather than silently touching nothing.
-- ---------------------------------------------------------------------------
create function public.update_plan(p_plan_id uuid, payload jsonb)
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
    corp_fixed_total_lifetime_value = x.corp_fixed_total_lifetime_value
  from jsonb_to_record(payload->'plan') as x(
    plan_month text, plan_year integer, household_income numeric, priorities text[],
    target_independence_age integer, success_retirement_income text,
    success_passive_income text, success_liquid_capital text, success_net_worth text,
    corp_fixed_annual_tax_free_income numeric, corp_fixed_contribution_period_years integer,
    corp_fixed_estate_value numeric, corp_fixed_total_lifetime_value numeric
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

revoke execute on function public.update_plan(uuid, jsonb) from public;
grant execute on function public.update_plan(uuid, jsonb) to authenticated;
