-- =============================================================================
-- Database setup for the site. Paste this whole file into Supabase → SQL Editor
-- and run it. It is idempotent: running it again is safe and upgrades older
-- installs (it replaces the policies, it never deletes your content).
--
-- After running it, allow your own account to edit (see the bottom of the file).
-- =============================================================================

-- --- Site content -----------------------------------------------------------
-- The whole site is one JSON document stored in a single row with id = 'main'.
create table if not exists public.site_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;

-- --- Editors allowlist -------------------------------------------------------
-- Only users listed here may change content or media. Being signed in is NOT
-- enough: Supabase allows public sign-ups by default, so without this list any
-- stranger could create an account and edit your site.
create table if not exists public.site_editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_editors enable row level security;

-- Editors may see their own membership (the admin uses this to show a helpful
-- message). Nobody can add or remove editors through the API — only via SQL.
drop policy if exists "Editors can see their own membership" on public.site_editors;
create policy "Editors can see their own membership" on public.site_editors
  for select to authenticated using (user_id = (select auth.uid()));

-- --- Content policies --------------------------------------------------------
drop policy if exists "Public can read the love story" on public.site_content;
drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content" on public.site_content
  for select using (true);

drop policy if exists "Only authenticated editors can insert" on public.site_content;
drop policy if exists "Editors can insert site content" on public.site_content;
create policy "Editors can insert site content" on public.site_content
  for insert to authenticated
  with check (exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())));

drop policy if exists "Only authenticated editors can update" on public.site_content;
drop policy if exists "Editors can update site content" on public.site_content;
create policy "Editors can update site content" on public.site_content
  for update to authenticated
  using (exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())));

-- --- Media storage -----------------------------------------------------------
-- Public bucket: files are served through their public URL without any policy.
-- Limits must stay in sync with MAX_UPLOAD_BYTES in src/lib/supabase.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anniversary-media', 'anniversary-media', true, 52428800, array['image/*', 'audio/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous listing of the bucket is not needed (and older installs allowed it).
drop policy if exists "Public can view media" on storage.objects;

drop policy if exists "Editors can read media" on storage.objects;
create policy "Editors can read media" on storage.objects
  for select to authenticated
  using (bucket_id = 'anniversary-media' and exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())));

drop policy if exists "Editors can upload media" on storage.objects;
create policy "Editors can upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anniversary-media' and exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())));

drop policy if exists "Editors can update media" on storage.objects;
create policy "Editors can update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'anniversary-media' and exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())));

drop policy if exists "Editors can delete media" on storage.objects;
create policy "Editors can delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anniversary-media' and exists (select 1 from public.site_editors e where e.user_id = (select auth.uid())));

-- =============================================================================
-- Grant edit access to your account (run once per editor, after creating the
-- user in Authentication → Users). Replace the e-mail address:
--
--   insert into public.site_editors (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
-- =============================================================================
