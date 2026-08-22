-- Stored delivery artifacts + the private bucket that holds them.
--
-- The app is otherwise stateless: DOCX/PDF previews are regenerated on the fly
-- from the plans tables and never persisted. THIS migration adds the one place
-- documents ARE kept — a permanent, append-only record of every file actually
-- delivered to a client. A row is written each time an advisor downloads the
-- PDF (see the download route); "keep every version" is the whole point, so
-- there is deliberately no UPDATE or DELETE policy — history is immutable and
-- only disappears when its parent plan is deleted (cascade).
--
-- Access model: the bucket is PRIVATE and gets no permissive storage policies,
-- so a normal authenticated client can neither read nor list it. All reads and
-- writes are brokered by server routes using the service-role key, which
-- bypasses RLS; the real authorization gate is plan_documents' own RLS (scoped
-- through owns_plan()), exactly like the rest of the schema.
--
-- Depends on 20260716000000 (is_admin) and 20260717000000 (plans, owns_plan).
-- Run with `supabase db push`. Not idempotent (except the bucket insert).

-- ---------------------------------------------------------------------------
-- Which renderings we store. Matches the two download buttons.
-- ---------------------------------------------------------------------------
create type public.document_format as enum ('docx', 'pdf');

-- ---------------------------------------------------------------------------
-- One row per delivered file. version counts up per (plan, format), so a plan
-- can accumulate PDF v1, v2, ... independently of its DOCX history. storage_path
-- is the object key inside the 'plan-documents' bucket; finalized_by records who
-- triggered the delivery (the downloader), which may be the owner or an admin.
-- ---------------------------------------------------------------------------
create table public.plan_documents (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.plans (id) on delete cascade,
  format       public.document_format not null,
  version      integer not null,
  storage_path text not null,
  file_size    bigint,
  finalized_by uuid not null references auth.users (id),
  created_at   timestamptz not null default now(),

  unique (plan_id, format, version)
);

create index plan_documents_plan_id_created_at_idx
  on public.plan_documents (plan_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS. Read/insert scoped through the parent plan via owns_plan(); admins see
-- and record everything. No update/delete policy: the delivery log is
-- append-only, so even the owner cannot rewrite what was sent.
-- ---------------------------------------------------------------------------
alter table public.plan_documents enable row level security;

create policy "plan_documents_select" on public.plan_documents
  for select to authenticated
  using (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

create policy "plan_documents_insert" on public.plan_documents
  for insert to authenticated
  with check (public.owns_plan(plan_id) or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- record_plan_document() — allocate the next version for a (plan, format) and
-- insert the row atomically, returning it. SECURITY INVOKER so the same RLS as
-- a direct insert applies: the caller can only log against a plan they own (or
-- any plan, if admin). finalized_by is forced to auth.uid() so a caller cannot
-- attribute a delivery to someone else.
--
-- The version is max()+1 read under the caller's own visibility. Two truly
-- simultaneous downloads of the same plan+format could pick the same number;
-- the unique(plan_id, format, version) constraint turns that race into a clean
-- error for the loser to retry rather than a duplicate version.
-- ---------------------------------------------------------------------------
create function public.record_plan_document(
  p_plan_id      uuid,
  p_format       public.document_format,
  p_storage_path text,
  p_file_size    bigint default null
)
returns public.plan_documents
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_version integer;
  v_row     public.plan_documents;
begin
  select coalesce(max(version), 0) + 1
    into v_version
    from public.plan_documents
   where plan_id = p_plan_id and format = p_format;

  insert into public.plan_documents
    (plan_id, format, version, storage_path, file_size, finalized_by)
  values
    (p_plan_id, p_format, v_version, p_storage_path, p_file_size, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function
  public.record_plan_document(uuid, public.document_format, text, bigint)
  from public;
grant execute on function
  public.record_plan_document(uuid, public.document_format, text, bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- The private bucket. public = false means no anonymous URLs; files are served
-- only via short-lived signed URLs minted server-side. The MIME allow-list and
-- size cap are defense-in-depth against an unexpected upload. Idempotent so a
-- re-run (or a bucket someone created by hand in the dashboard) is harmless.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plan-documents',
  'plan-documents',
  false,
  26214400, -- 25 MiB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- No storage.objects policies are created on purpose: the bucket stays fully
-- locked to normal clients, and every read/write goes through a server route
-- using the service-role key. If you later want users to fetch their own files
-- with a session-scoped client, add a select policy here keyed on a path
-- convention (e.g. first folder = plan_id and owns_plan() over it).
