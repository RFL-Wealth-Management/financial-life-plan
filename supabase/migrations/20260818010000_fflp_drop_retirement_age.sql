-- Retirement age belongs to the base IFLP (plans.target_independence_age), so
-- the FFLP sources it from there rather than collecting or storing its own copy.
-- Drop the plan_fflp.retirement_age column added in 20260818000000 and update
-- save_fflp() to match.
--
-- Depends on 20260818000000_fflp_extend.sql. Run with `supabase db push`. Not
-- idempotent (aside from the guarded drop).

alter table public.plan_fflp drop column if exists retirement_age;

create or replace function public.save_fflp(p_plan_id uuid, payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.plan_fflp (plan_id, recommended_salary, income_strategy_note)
  select p_plan_id, x.recommended_salary, x.income_strategy_note
  from jsonb_to_record(payload) as x(
    recommended_salary numeric, income_strategy_note text
  )
  on conflict (plan_id) do update set
    recommended_salary   = excluded.recommended_salary,
    income_strategy_note = excluded.income_strategy_note;

  return p_plan_id;
end;
$$;
