-- ───────── published site pages ─────────
-- A page from the studio's Site mode, published on purpose: #/w/<slug>.
-- Only the page itself goes public: its title, direction, theme, tree and the pictures it shows.
-- The project, its other pages, reviews, notes and files stay private.

create table public.published_pages (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  studio_id uuid not null references public.studios on delete cascade,
  project_id text not null references public.projects on delete cascade,
  page_id text not null,
  -- { title, dir, theme, root, media: { <assetId>: { url, kind, w, h, alt } } }
  doc jsonb not null,
  published_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, page_id)
);
create index on public.published_pages (studio_id);

alter table public.published_pages enable row level security;

-- anyone with the link reads a published page (that is what publishing means)
create policy "published pages: anyone reads" on public.published_pages
  for select using (true);
-- only editors of the studio publish, update and unpublish
create policy "published pages: editors insert" on public.published_pages
  for insert to authenticated with check (private.can_edit(studio_id));
create policy "published pages: editors update" on public.published_pages
  for update to authenticated using (private.can_edit(studio_id)) with check (private.can_edit(studio_id));
create policy "published pages: editors delete" on public.published_pages
  for delete to authenticated using (private.can_edit(studio_id));

-- pictures of published pages: a separate, public bucket; path = <studio_id>/<slug>/<file>
insert into storage.buckets (id, name, public, file_size_limit)
values ('site-media', 'site-media', true, 52428800)
on conflict (id) do nothing;

create policy "site-media: editors write" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and private.can_edit(((storage.foldername(name))[1])::uuid));
create policy "site-media: editors update" on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and private.can_edit(((storage.foldername(name))[1])::uuid));
create policy "site-media: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and private.can_edit(((storage.foldername(name))[1])::uuid));
-- editors see the files they published (to replace and remove them); the public reads by URL only
create policy "site-media: editors read" on storage.objects for select to authenticated
  using (bucket_id = 'site-media' and private.can_edit(((storage.foldername(name))[1])::uuid));
