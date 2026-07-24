create extension if not exists pgcrypto;

create table if not exists public.thesis_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My KNUT Thesis',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.thesis_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','editor','viewer')),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists thesis_members_project_email
  on public.thesis_project_members(project_id, lower(email));
create unique index if not exists thesis_members_project_user
  on public.thesis_project_members(project_id, user_id)
  where user_id is not null;
create index if not exists thesis_members_user on public.thesis_project_members(user_id);

alter table public.thesis_projects enable row level security;
alter table public.thesis_project_members enable row level security;
revoke all on public.thesis_projects, public.thesis_project_members from anon;
grant select on public.thesis_projects, public.thesis_project_members to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_thesis_member(target_project uuid)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from public.thesis_project_members
    where project_id = target_project and user_id = (select auth.uid())
  );
$$;
grant usage on schema private to authenticated;
revoke all on function private.is_thesis_member(uuid) from public, anon;
grant execute on function private.is_thesis_member(uuid) to authenticated;

drop policy if exists "members can read projects" on public.thesis_projects;
create policy "members can read projects" on public.thesis_projects
for select to authenticated using ((select private.is_thesis_member(id)));

drop policy if exists "members can read memberships" on public.thesis_project_members;
create policy "members can read memberships" on public.thesis_project_members
for select to authenticated using ((select private.is_thesis_member(project_id)));

create or replace function public.list_my_thesis_projects()
returns table(project_id uuid, project_name text, member_role text, owner_id uuid)
language plpgsql security definer set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt()->>'email',''));
  created_project uuid;
begin
  if uid is null or mail = '' then raise exception 'Authentication required'; end if;

  update public.thesis_project_members
     set user_id = uid, accepted_at = coalesce(accepted_at, now())
   where user_id is null and lower(email) = mail;

  if not exists (select 1 from public.thesis_project_members where user_id = uid) then
    insert into public.thesis_projects(owner_id, name)
    values (uid, 'My KNUT Thesis') returning id into created_project;
    insert into public.thesis_project_members(project_id,user_id,email,role,invited_by,accepted_at)
    values (created_project,uid,mail,'owner',uid,now());
  end if;

  return query
    select p.id,p.name,m.role,p.owner_id
      from public.thesis_project_members m
      join public.thesis_projects p on p.id=m.project_id
     where m.user_id=uid
     order by (m.role='owner') desc,p.created_at;
end;
$$;

create or replace function public.get_thesis_project_access(target_project uuid)
returns table(project_id uuid, project_name text, member_role text, owner_id uuid)
language sql security definer set search_path = public, auth
as $$
  select p.id,p.name,m.role,p.owner_id
    from public.thesis_project_members m
    join public.thesis_projects p on p.id=m.project_id
   where p.id=target_project and m.user_id=auth.uid();
$$;

create or replace function public.list_thesis_project_members(target_project uuid)
returns table(member_id uuid, email text, member_role text, accepted boolean)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.thesis_project_members
    where project_id=target_project and user_id=auth.uid() and role='owner'
  ) then raise exception 'Only the owner can manage members'; end if;
  return query select id,thesis_project_members.email,role,(user_id is not null)
    from public.thesis_project_members
    where project_id=target_project order by (role='owner') desc,created_at;
end;
$$;

create or replace function public.invite_thesis_project_member(target_project uuid, target_email text, target_role text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare normalized text := lower(trim(target_email)); existing_id uuid;
begin
  if target_role not in ('editor','viewer') then raise exception 'Invalid role'; end if;
  if normalized = '' then raise exception 'Email is required'; end if;
  if not exists (select 1 from public.thesis_project_members where project_id=target_project and user_id=auth.uid() and role='owner')
    then raise exception 'Only the owner can invite members'; end if;
  select id into existing_id from public.thesis_project_members where project_id=target_project and lower(email)=normalized;
  if existing_id is null and (select count(*) from public.thesis_project_members where project_id=target_project) >= 6
    then raise exception 'A project supports at most 6 members'; end if;
  if existing_id is null then
    insert into public.thesis_project_members(project_id,email,role,invited_by)
    values(target_project,normalized,target_role,auth.uid());
  else
    update public.thesis_project_members set role=target_role
    where id=existing_id and role<>'owner';
  end if;
end;
$$;

create or replace function public.update_thesis_project_member(target_project uuid, target_member uuid, target_role text)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if target_role not in ('editor','viewer') then raise exception 'Invalid role'; end if;
  if not exists (select 1 from public.thesis_project_members where project_id=target_project and user_id=auth.uid() and role='owner')
    then raise exception 'Only the owner can update members'; end if;
  update public.thesis_project_members set role=target_role
   where id=target_member and project_id=target_project and role<>'owner';
end;
$$;

create or replace function public.remove_thesis_project_member(target_project uuid, target_member uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.thesis_project_members where project_id=target_project and user_id=auth.uid() and role='owner')
    then raise exception 'Only the owner can remove members'; end if;
  delete from public.thesis_project_members
   where id=target_member and project_id=target_project and role<>'owner';
end;
$$;

revoke all on function public.list_my_thesis_projects() from public, anon;
revoke all on function public.get_thesis_project_access(uuid) from public, anon;
revoke all on function public.list_thesis_project_members(uuid) from public, anon;
revoke all on function public.invite_thesis_project_member(uuid,text,text) from public, anon;
revoke all on function public.update_thesis_project_member(uuid,uuid,text) from public, anon;
revoke all on function public.remove_thesis_project_member(uuid,uuid) from public, anon;
grant execute on function public.list_my_thesis_projects() to authenticated;
grant execute on function public.get_thesis_project_access(uuid) to authenticated;
grant execute on function public.list_thesis_project_members(uuid) to authenticated;
grant execute on function public.invite_thesis_project_member(uuid,text,text) to authenticated;
grant execute on function public.update_thesis_project_member(uuid,uuid,text) to authenticated;
grant execute on function public.remove_thesis_project_member(uuid,uuid) to authenticated;
