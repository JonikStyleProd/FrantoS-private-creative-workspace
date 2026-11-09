-- Public portfolio pages (#/u/:handle). One per account. Nothing is visible until the
-- owner presses "Publish": anon can read a row only while published = true, and the
-- page only lists projects whose case pages are already public.
create table if not exists public.portfolios (
  owner_id uuid primary key references auth.users on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  published boolean not null default false,
  doc jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

create policy "portfolios: public read when published" on public.portfolios
  for select to anon, authenticated using (published = true);
create policy "portfolios: owner reads" on public.portfolios
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "portfolios: owner inserts" on public.portfolios
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "portfolios: owner updates" on public.portfolios
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "portfolios: owner deletes" on public.portfolios
  for delete to authenticated using (owner_id = (select auth.uid()));
