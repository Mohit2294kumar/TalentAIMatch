
-- Enable pgvector
create extension if not exists vector;

-- Roles
create type public.app_role as enum ('admin', 'recruiter');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_self_select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_self_select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + default recruiter role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'recruiter');
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text,
  department text,
  experience_required text,
  skills_required text[] not null default '{}',
  education_required text,
  description text not null,
  jd_embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "jobs_owner_all" on public.jobs for all to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id);

-- Resumes / Candidates
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  file_name text not null,
  file_path text not null,
  status text not null default 'pending', -- pending | processing | completed | failed
  resume_text text,
  parsed_data jsonb,
  embedding vector(1536),
  score numeric,
  section_scores jsonb,
  insights jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.resumes to authenticated;
grant all on public.resumes to service_role;
alter table public.resumes enable row level security;
create policy "resumes_owner_all" on public.resumes for all to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id);

create index resumes_job_id_idx on public.resumes(job_id);
create index resumes_score_idx on public.resumes(score desc);
create index jobs_user_id_idx on public.jobs(user_id);

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger jobs_touch before update on public.jobs for each row execute function public.touch_updated_at();
create trigger resumes_touch before update on public.resumes for each row execute function public.touch_updated_at();

-- Realtime
alter publication supabase_realtime add table public.resumes;
alter publication supabase_realtime add table public.jobs;
alter table public.resumes replica identity full;
alter table public.jobs replica identity full;
