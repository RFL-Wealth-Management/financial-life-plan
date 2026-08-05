-- Adds the human-facing contact fields the "Manage Users" admin screen edits.
-- Email already lives on profiles (mirroring auth.users), so only the three new
-- fields land here. All nullable: existing rows predate this screen and the
-- fields are optional.
--
-- Run with `supabase db push`, or paste into the Supabase SQL editor.

alter table public.profiles
  add column name     text,
  add column position text,
  add column phone    text;

comment on column public.profiles.position is
  'Job title / role label shown in the admin user list. Distinct from the '
  'access role in the "role" column (admin | user).';
