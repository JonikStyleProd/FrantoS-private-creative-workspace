-- FrantoS core schema: studios, members, projects, comments, review links, invites, files.
-- Access is enforced by RLS. Guests (clients without an account) only get in through
-- security-definer RPCs that check a review-link token.

create extension if not exists pgcrypto;

-- ───────── people & studios ─────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'editor', 'client');

create table public.studio_members (
  studio_id uuid not null references public.studios on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (studio_id, user_id)
);
create index on public.studio_members (user_id);

create or replace function public.member_role_in(s uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select role from public.studio_members where studio_id = s and user_id = auth.uid()
$$;

create or replace function public.is_member(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.studio_members where studio_id = s and user_id = auth.uid())
$$;

create or replace function public.can_edit(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.member_role_in(s) in ('owner', 'editor'), false)
$$;

-- new user → profile + personal studio (owner)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  insert into public.studios (name, created_by) values ('My studio', new.id) returning id into sid;
  insert into public.studio_members (studio_id, user_id, role) values (sid, new.id, 'owner');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- a studio created by hand gets its creator as owner
create or replace function public.handle_new_studio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.studio_members (studio_id, user_id, role) values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end $$;
create trigger on_studio_created after insert on public.studios for each row when (new.created_by is not null) execute function public.handle_new_studio();

-- ───────── projects ─────────
-- The project document (materials, works/versions, moodboard, story, presentation…) is one JSONB doc:
-- small studios, few concurrent editors; `rev` gives optimistic concurrency.
create table public.projects (
  id text primary key,
  studio_id uuid not null references public.studios on delete cascade,
  title text not null,
  doc jsonb not null,
  rev integer not null default 1,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  public_slug text unique,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.projects (studio_id, updated_at desc);

-- ───────── review: comments are separate rows (clients write them, live updates) ─────────
create table public.comments (
  id text primary key,
  project_id text not null references public.projects on delete cascade,
  work_id text not null,
  version_id text not null,
  parent_id text references public.comments on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  -- pin {x,y} | area {x,y,w,h} | drawing [[x,y]…] | t | t2  — all in the work's own coordinates
  anchor jsonb not null default '{}'::jsonb,
  is_task boolean not null default false,
  author_id uuid references auth.users on delete set null,
  author_name text not null,
  guest_link uuid,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.comments (project_id, created_at);

create table public.review_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  project_id text not null references public.projects on delete cascade,
  work_id text,
  can_comment boolean not null default true,
  label text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked boolean not null default false
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  studio_id uuid not null references public.studios on delete cascade,
  role public.member_role not null default 'editor',
  email text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  accepted_by uuid references auth.users on delete set null,
  accepted_at timestamptz
);

-- ───────── RLS ─────────
alter table public.profiles enable row level security;
alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
alter table public.projects enable row level security;
alter table public.comments enable row level security;
alter table public.review_links enable row level security;
alter table public.invites enable row level security;

create policy "profiles: read co-members" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.studio_members a join public.studio_members b on a.studio_id = b.studio_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy "profiles: update self" on public.profiles for update to authenticated using (id = auth.uid());

create policy "studios: members read" on public.studios for select to authenticated using (public.is_member(id));
create policy "studios: create" on public.studios for insert to authenticated with check (created_by = auth.uid());
create policy "studios: owner updates" on public.studios for update to authenticated using (public.member_role_in(id) = 'owner');
create policy "studios: owner deletes" on public.studios for delete to authenticated using (public.member_role_in(id) = 'owner');

create policy "members: read" on public.studio_members for select to authenticated using (public.is_member(studio_id));
create policy "members: owner manages" on public.studio_members for all to authenticated
  using (public.member_role_in(studio_id) = 'owner') with check (public.member_role_in(studio_id) = 'owner');
create policy "members: leave" on public.studio_members for delete to authenticated using (user_id = auth.uid());

create policy "projects: members read" on public.projects for select to authenticated using (public.is_member(studio_id));
create policy "projects: public read" on public.projects for select to anon, authenticated using (visibility = 'public');
create policy "projects: editors write" on public.projects for insert to authenticated with check (public.can_edit(studio_id));
create policy "projects: editors update" on public.projects for update to authenticated using (public.can_edit(studio_id)) with check (public.can_edit(studio_id));
create policy "projects: editors delete" on public.projects for delete to authenticated using (public.can_edit(studio_id));

create policy "comments: members read" on public.comments for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_member(p.studio_id)));
create policy "comments: members write" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and public.is_member(p.studio_id)));
create policy "comments: members resolve" on public.comments for update to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_member(p.studio_id)));
create policy "comments: author or editor deletes" on public.comments for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from public.projects p where p.id = project_id and public.can_edit(p.studio_id)));

create policy "links: editors" on public.review_links for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and public.can_edit(p.studio_id)))
  with check (exists (select 1 from public.projects p where p.id = project_id and public.can_edit(p.studio_id)));

create policy "invites: owner" on public.invites for all to authenticated
  using (public.member_role_in(studio_id) = 'owner') with check (public.member_role_in(studio_id) = 'owner');

-- ───────── guest review (no account) ─────────
create or replace function public.review_open(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l public.review_links; p public.projects;
begin
  select * into l from public.review_links where token = p_token and not revoked and (expires_at is null or expires_at > now());
  if not found then return null; end if;
  select * into p from public.projects where id = l.project_id;
  return jsonb_build_object(
    'link', jsonb_build_object('id', l.id, 'work_id', l.work_id, 'can_comment', l.can_comment, 'label', l.label),
    'project', jsonb_build_object('id', p.id, 'title', p.title, 'doc', p.doc, 'studio_id', p.studio_id),
    'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.comments c where c.project_id = p.id
                          and (l.work_id is null or c.work_id = l.work_id)), '[]'::jsonb));
end $$;

create or replace function public.review_comment(p_token text, p_name text, p_work text, p_version text, p_body text, p_anchor jsonb, p_parent text default null)
returns public.comments language plpgsql security definer set search_path = public as $$
declare l public.review_links; c public.comments;
begin
  select * into l from public.review_links where token = p_token and not revoked and can_comment and (expires_at is null or expires_at > now());
  if not found then raise exception 'link not valid'; end if;
  if l.work_id is not null and l.work_id <> p_work then raise exception 'work not in link'; end if;
  insert into public.comments (id, project_id, work_id, version_id, parent_id, body, anchor, author_name, guest_link)
  values ('g-' || replace(gen_random_uuid()::text, '-', ''), l.project_id, p_work, p_version, p_parent,
          left(p_body, 4000), coalesce(p_anchor, '{}'::jsonb), left(coalesce(nullif(trim(p_name), ''), 'Guest'), 60) || ' · guest', l.id)
  returning * into c;
  return c;
end $$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i public.invites;
begin
  select * into i from public.invites where token = p_token and accepted_at is null;
  if not found then raise exception 'invite not valid'; end if;
  insert into public.studio_members (studio_id, user_id, role) values (i.studio_id, auth.uid(), i.role)
  on conflict (studio_id, user_id) do update set role = excluded.role;
  update public.invites set accepted_by = auth.uid(), accepted_at = now() where id = i.id;
  return i.studio_id;
end $$;

revoke all on function public.review_open(text) from public;
revoke all on function public.review_comment(text, text, text, text, text, jsonb, text) from public;
revoke all on function public.accept_invite(text) from public;
grant execute on function public.review_open(text) to anon, authenticated;
grant execute on function public.review_comment(text, text, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- ───────── files: private bucket, path = <studio_id>/<project_id>/<file> ─────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('assets', 'assets', false, 262144000)
on conflict (id) do nothing;

create policy "assets: members read" on storage.objects for select to authenticated
  using (bucket_id = 'assets' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "assets: editors write" on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and public.can_edit(((storage.foldername(name))[1])::uuid));
create policy "assets: editors update" on storage.objects for update to authenticated
  using (bucket_id = 'assets' and public.can_edit(((storage.foldername(name))[1])::uuid));
create policy "assets: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and public.can_edit(((storage.foldername(name))[1])::uuid));

-- live review
alter publication supabase_realtime add table public.comments;

-- create a studio and become its owner in one step
create or replace function public.create_studio(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.studios (name, created_by) values (left(coalesce(nullif(trim(p_name), ''), 'Studio'), 80), auth.uid()) returning id into sid;
  return sid;
end $$;
revoke all on function public.create_studio(text) from public;
grant execute on function public.create_studio(text) to authenticated;

-- only the guest review RPCs are meant for anonymous callers
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_new_studio() from anon, authenticated;
revoke execute on function public.is_member(uuid) from anon;
revoke execute on function public.can_edit(uuid) from anon;
revoke execute on function public.member_role_in(uuid) from anon;
revoke execute on function public.accept_invite(text) from anon;
revoke execute on function public.create_studio(text) from anon;
