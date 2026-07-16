-- TEST DATA ONLY — not a migration. Do not add to supabase/migrations/.
--
-- Gives every existing profile two reports so the dashboard and Manage Reports
-- lists have something to render, and so an admin can see the owner-email
-- column working across more than one user.
--
-- Run it in the Supabase SQL editor. It has to run as postgres (which the
-- editor does) rather than through the app: documents_insert_own only permits
-- a row where auth.uid() = owner_id, so a signed-in session cannot fabricate
-- another user's report. That policy is doing its job — this file goes around
-- it deliberately, which is why it is test-only.
--
-- CAVEAT: these rows have no matching output/{id}.docx on disk, so their
-- Download links will 404. They verify the LISTS, not the download path. For a
-- genuine end-to-end row, click "New report" in the app instead.
--
-- Cleanup is at the bottom.

insert into public.documents (id, owner_id, client1_name, client2_name, created_at)
select
  gen_random_uuid(),
  profiles.id,
  sample.client1_name,
  sample.client2_name,
  now() - (sample.days_ago || ' days')::interval
from public.profiles
cross join (values
  ('[test] Ana Silva',  '[test] Marco Silva', 2),
  ('[test] Peter Chen', null,                 9)
) as sample(client1_name, client2_name, days_ago);

-- Undo: removes every seeded row and nothing else. The [test] prefix is what
-- makes this safe to run — real reports are named from the generator form and
-- never carry it.
--
-- delete from public.documents where client1_name like '[test]%';
