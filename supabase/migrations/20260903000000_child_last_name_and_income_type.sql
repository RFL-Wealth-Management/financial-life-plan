-- Two form changes that need columns behind them:
--   1. Children are entered as first + last name (was a single "name" field).
--   2. Income Alignment is per-client salary OR dividends, not salary only.
--
-- plan_children.name held the child's first name. It becomes first_name, and a
-- last_name lands beside it — existing rows keep their value as the first name,
-- which is what they were.
--
-- plan_income_alignment.amount stays as-is (it is now "whatever this client
-- draws"); income_type says which structure that amount is. Existing rows are
-- salary, the only structure the form could produce before this migration.
--
-- insert_plan_children() is replaced (not altered) to write the new columns.
-- Depends on 20260804010000_iflp_plan_update.sql. Run with `supabase db push`.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.plan_children rename column name to first_name;
alter table public.plan_children add column last_name text;

create type public.income_structure as enum ('salary', 'dividend');

alter table public.plan_income_alignment
  add column income_type public.income_structure not null default 'salary';

-- ---------------------------------------------------------------------------
-- Shared child inserts, re-declared with the new columns. Body is otherwise
-- identical to 20260804010000_iflp_plan_update.sql.
-- ---------------------------------------------------------------------------
create or replace function public.insert_plan_children(v_plan_id uuid, payload jsonb)
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

  insert into public.plan_children (plan_id, first_name, last_name, education_cost, education_years_away, sort_order)
  select v_plan_id, r.first_name, r.last_name, r.education_cost, r.education_years_away, r.sort_order
  from jsonb_to_recordset(coalesce(payload->'children', '[]'::jsonb)) as r(
    first_name text, last_name text, education_cost numeric,
    education_years_away integer, sort_order integer
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

  insert into public.plan_income_alignment (plan_id, party_id, amount, income_type, sort_order)
  select v_plan_id, r.party_id, r.amount, coalesce(r.income_type, 'salary'), r.sort_order
  from jsonb_to_recordset(coalesce(payload->'income_alignment', '[]'::jsonb)) as r(
    party_id uuid, amount numeric, income_type public.income_structure, sort_order integer
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
