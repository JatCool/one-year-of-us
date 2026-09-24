-- Run this once in Supabase SQL Editor. Add your own account through /admin afterwards.
create table if not exists public.site_content (
  id text primary key default 'main' check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy "Public can read the love story" on public.site_content for select using (true);
create policy "Only authenticated editors can insert" on public.site_content for insert to authenticated with check (true);
create policy "Only authenticated editors can update" on public.site_content for update to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('anniversary-media', 'anniversary-media', true) on conflict (id) do nothing;
create policy "Public can view media" on storage.objects for select using (bucket_id = 'anniversary-media');
create policy "Editors can upload media" on storage.objects for insert to authenticated with check (bucket_id = 'anniversary-media');
create policy "Editors can update media" on storage.objects for update to authenticated using (bucket_id = 'anniversary-media');
create policy "Editors can delete media" on storage.objects for delete to authenticated using (bucket_id = 'anniversary-media');
