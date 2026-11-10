-- FrantoS private access: one super admin, accounts only by invitation, developers and clients.
--
-- • The very first account becomes the admin. After that, auth.users only accepts emails the admin
--   has put on the allowlist (the admin-users edge function does this when it creates an account),
--   so a sign-up form or a magic link for any other email fails inside the database.
-- • Roles: admin · developer (edits every studio project) · client (sees only projects shared with them,
--   comments and approves).
-- • Clients reach a project through project_access, not studio membership.

-- ───────── platform role on the profile ─────────
do $$ begin
  create type public.platform_role as enum ('admin', 'developer', 'client');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists platform_role public.platform_role not null default 'developer',
  add column if not exists must_change_password boolean not null default false,
  add column if not exists email text,
  add column if not exists disabled boolean not null default false,
  add column if not exists avatar text check (avatar is null or (avatar like 'data:image/%' and length(avatar) < 200000));

-- users may change their name only; role, flags and email are set by the server
-- if the admin's account was made before this migration, the oldest account is the admin
update public.profiles p set platform_role = 'admin', email = lower(u.email)
  from auth.users u
 where p.id = u.id and u.id = (select id from auth.users order by created_at limit 1);
update public.profiles p set email = lower(u.email) from auth.users u where p.id = u.id and p.email is null;

revoke update on public.profiles from authenticated, anon;
grant update (name, avatar) on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and platform_role = 'admin' and not disabled)
$$;

-- ───────── allowlist ─────────
create table if not exists public.allowed_accounts (
  email text primary key check (email = lower(email)),
  role public.platform_role not null,
  name text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.allowed_accounts enable row level security;
create policy "allowlist: admin" on public.allowed_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- bootstrap: the first account ever is the admin
  if not exists (select 1 from auth.users) then
    return new;
  end if;
  if not exists (select 1 from public.allowed_accounts where email = lower(new.email)) then
    raise exception 'FrantoS is invitation only' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_new_user on auth.users;
create trigger guard_new_user before insert on auth.users for each row execute function public.guard_new_user();

-- new user → profile; admin gets the studio, developers join it, clients get no studio
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
  first boolean := not exists (select 1 from public.profiles);
  a public.allowed_accounts;
  r public.platform_role;
begin
  select * into a from public.allowed_accounts where email = lower(new.email);
  r := case when first then 'admin'::public.platform_role else coalesce(a.role, 'client') end;
  insert into public.profiles (id, name, email, platform_role, must_change_password)
  values (new.id,
          coalesce(a.name, new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          lower(new.email), r,
          coalesce((new.raw_user_meta_data->>'temp_password')::boolean, false));
  if r = 'admin' then
    insert into public.studios (name, created_by) values ('FrantoS', new.id) returning id into sid;
    insert into public.studio_members (studio_id, user_id, role) values (sid, new.id, 'owner') on conflict do nothing;
  elsif r = 'developer' then
    insert into public.studio_members (studio_id, user_id, role)
    select s.id, new.id, 'editor' from public.studios s
    join public.profiles p on p.id = s.created_by and p.platform_role = 'admin'
    on conflict do nothing;
  end if;
  return new;
end $$;

-- ───────── client access to single projects ─────────
create table if not exists public.project_access (
  project_id text not null references public.projects on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  can_approve boolean not null default true,
  granted_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_access_user on public.project_access (user_id);
alter table public.project_access enable row level security;
create policy "access: admin manages" on public.project_access for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "access: user reads own" on public.project_access for select to authenticated using (user_id = auth.uid());

create or replace function public.has_project_access(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_access where project_id = p and user_id = auth.uid())
$$;

create policy "projects: client reads shared" on public.projects for select to authenticated using (public.has_project_access(id));
create policy "comments: client reads" on public.comments for select to authenticated using (public.has_project_access(project_id));
create policy "comments: client writes" on public.comments for insert to authenticated with check (author_id = auth.uid() and public.has_project_access(project_id));
create policy "comments: client resolves own" on public.comments for update to authenticated using (author_id = auth.uid() and public.has_project_access(project_id));
create policy "assets: client reads shared" on storage.objects for select to authenticated
  using (bucket_id = 'assets' and public.has_project_access((storage.foldername(name))[2]));

-- the admin sees every profile (to manage accounts)
create policy "profiles: admin reads all" on public.profiles for select to authenticated using (public.is_admin());

-- a client may approve a version on a shared project: stored on the project doc by the server
create or replace function public.client_approve(p_project text, p_work text, p_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.project_access where project_id = p_project and user_id = auth.uid() and can_approve) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.projects
     set doc = jsonb_set(doc, '{works}', (
           select coalesce(jsonb_agg(case when w->>'id' = p_work then w || jsonb_build_object('approvedVersionId', p_version, 'status', 'done') else w end), '[]'::jsonb)
             from jsonb_array_elements(doc->'works') w)),
         rev = rev + 1, updated_by = auth.uid(), updated_at = now()
   where id = p_project;
end $$;

-- ───────── first sign-in: clear the temporary-password flag after the user set their own ─────────
create or replace function public.password_changed()
returns void language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid()
$$;

-- ───────── admin audit log (written by the edge function with the service role) ─────────
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  actor uuid references auth.users on delete set null,
  action text not null,
  target text,
  meta jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create policy "audit: admin reads" on public.admin_audit for select to authenticated using (public.is_admin());

-- ───────── no open studio creation and no self-service invites any more ─────────
drop policy if exists "studios: create" on public.studios;
create policy "studios: admin creates" on public.studios for insert to authenticated with check (created_by = auth.uid() and public.is_admin());

-- ───────── function exposure ─────────
-- RLS helpers move to a schema the API does not serve: policies keep working (they point at the function,
-- not its name), but nobody can call them over /rest/v1/rpc any more.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_member(uuid) set schema private;
alter function public.member_role_in(uuid) set schema private;
alter function public.can_edit(uuid) set schema private;
alter function public.is_admin() set schema private;
alter function public.has_project_access(text) set schema private;
alter function public.guard_new_user() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_new_studio() set schema private;

-- can_edit called member_role_in by its old name
create or replace function private.can_edit(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.member_role_in(s) in ('owner', 'editor'), false)
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_member(uuid), private.member_role_in(uuid), private.can_edit(uuid),
  private.is_admin(), private.has_project_access(text) to authenticated;

-- studios are created by the admin only; invitations by link are replaced by admin-created accounts
create or replace function public.create_studio(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not private.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  insert into public.studios (name, created_by) values (left(coalesce(nullif(trim(p_name), ''), 'Studio'), 80), auth.uid()) returning id into sid;
  return sid;
end $$;
revoke all on function public.create_studio(text) from public, anon;
revoke all on function public.accept_invite(text) from public, anon, authenticated;
revoke all on function public.client_approve(text, text, text) from public, anon;
revoke all on function public.password_changed() from public, anon;
grant execute on function public.create_studio(text) to authenticated;
grant execute on function public.client_approve(text, text, text) to authenticated;
grant execute on function public.password_changed() to authenticated;

-- ───────── end every session of a user (password reset, lock, "sign out everywhere") ─────────
-- callable only with the service role, i.e. from the admin-users edge function
create or replace function public.admin_revoke_sessions(p_user uuid)
returns void language sql security definer set search_path = public, auth as $$
  delete from auth.sessions where user_id = p_user;
$$;
revoke all on function public.admin_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_sessions(uuid) to service_role;

-- a signed-in user can end all of their own sessions
create or replace function public.revoke_my_sessions()
returns void language sql security definer set search_path = public, auth as $$
  delete from auth.sessions where user_id = auth.uid();
$$;
revoke all on function public.revoke_my_sessions() from public, anon;
grant execute on function public.revoke_my_sessions() to authenticated;
