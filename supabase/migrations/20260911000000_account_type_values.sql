-- FHSA and Non-Registered join the account types, and the personal accounts gain
-- their own retirement-income sources.
--
-- Kept in its own migration with nothing else in it: `alter type ... add value`
-- cannot be used in the same transaction that adds it, so any code referencing
-- the new literals must land in a later migration. Nothing here does.
--
-- No function is re-declared. insert_plan_children() casts payload values to
-- these enums generically, so new values need no change there.
--
-- Depends on 20260909000000_plan_options.sql.
-- Run with `supabase db push`. Not idempotent.

alter type public.account_type add value 'fhsa';
alter type public.account_type add value 'non_registered';

-- Needed so each personal account can carry its own projected retirement income
-- (the Personal Savings Bucket sums them).
alter type public.retirement_income_source add value 'rrsp';
alter type public.retirement_income_source add value 'fhsa';
alter type public.retirement_income_source add value 'non_registered';
