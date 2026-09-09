-- FFLP extension.
--
-- The FFLP (fully-implemented Financial Life Plan) reuses an existing IFLP plan
-- as its base and adds implementation-stage detail on top. Rather than a
-- plan_type discriminator on plans, FFLP-only data hangs off the plan in its own
-- tables — so every existing IFLP query is untouched, and "an FFLP exists for
-- this plan" is simply "a plan_fflp row exists".
--
-- This first slice covers wizard step 1 (Profile & Income Strategy): a 1:1
-- plan_fflp row with scalar fields. Later steps add plan_fflp_* child tables the
-- same way the IFLP schema grew (see 20260804000000_iflp_plan_extras.sql).
--
-- Depends on 20260717000000_iflp_plans.sql for public.plans, public.owns_plan(),
-- public.is_admin() and public.touch_updated_at(). Run with `supabase db push`,
-- or paste into the SQL editor. Not idempotent.

-- ---------------------------------------------------------------------------
-- plan_fflp — one row per plan (1:1). Its existence marks that the plan has an
-- FFLP. Scalar FFLP-only fields live here; repeating FFLP data (later steps)
-- will go in plan_fflp_* child tables keyed by plan_id.
-- ---------------------------------------------------------------------------
create table public.plan_fflp (
  plan_id              uuid primary key references public.plans (id) on delete cascade,

  -- Step 1 — Profile & Income Strategy
  retirement_age       integer,   -- Profile "Retirement Age" (defaults from the plan's target age)
  recommended_salary   numeric,   -- Income Strategy "Recommended Structure" salary per person
  income_strategy_note text,      -- optional planner note on the salary/dividend structure

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — scoped through the parent plan via owns_plan(), identical to the IFLP
-- child tables. A user may only touch an FFLP row for a plan they own (admins,
-- everything).
-- ---------------------------------------------------------------------------
alter table public.plan_fflp enable row level security;

create policy "plan_fflp_all" on public.plan_fflp
  for all to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()))
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create trigger plan_fflp_touch_updated_at
  before update on public.plan_fflp
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- save_fflp() — upsert the FFLP extras for a plan. SECURITY INVOKER, so the
-- write passes through RLS as the caller: the with-check on plan_fflp_all stops
-- anyone attaching FFLP data to a plan they don't own. One function covers both
-- create and edit (the row is 1:1, so on-conflict updates in place). Returns the
-- plan id.
-- ---------------------------------------------------------------------------
create function public.save_fflp(p_plan_id uuid, payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.plan_fflp (plan_id, retirement_age, recommended_salary, income_strategy_note)
  select p_plan_id, x.retirement_age, x.recommended_salary, x.income_strategy_note
  from jsonb_to_record(payload) as x(
    retirement_age integer, recommended_salary numeric, income_strategy_note text
  )
  on conflict (plan_id) do update set
    retirement_age       = excluded.retirement_age,
    recommended_salary   = excluded.recommended_salary,
    income_strategy_note = excluded.income_strategy_note;

  return p_plan_id;
end;
$$;

revoke execute on function public.save_fflp(uuid, jsonb) from public;
grant execute on function public.save_fflp(uuid, jsonb) to authenticated;
