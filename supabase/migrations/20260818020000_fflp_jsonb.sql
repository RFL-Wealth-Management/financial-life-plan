-- FFLP data as JSONB.
--
-- The FFLP body is a large, still-growing set of presentation figures (dozens of
-- currency fields across many sections). Rather than a column or child table per
-- field, store the whole FFLP-only form state as a single JSONB blob on plan_fflp.
-- Its existence still marks that the plan has an FFLP; save_fflp() upserts the blob.
--
-- Replaces the two scalar columns from 20260818000000 / 20260818010000.
--
-- Depends on 20260818000000_fflp_extend.sql. Run with `supabase db push`. Not
-- idempotent.

alter table public.plan_fflp
  add column data jsonb not null default '{}'::jsonb,
  drop column if exists recommended_salary,
  drop column if exists income_strategy_note;

create or replace function public.save_fflp(p_plan_id uuid, payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.plan_fflp (plan_id, data)
  values (p_plan_id, coalesce(payload, '{}'::jsonb))
  on conflict (plan_id) do update set data = excluded.data;
  return p_plan_id;
end;
$$;
