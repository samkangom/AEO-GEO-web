-- ClearCite initial schema.
--
-- RLS convention: only `brands` carries user_id. Every other table is scoped
-- through its brand (directly via brand_id, or via monitor_runs for
-- engine_results) using the owns_brand() helper, so ownership is defined in
-- exactly one place.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_name text,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  url text not null check (url ~* '^https?://'),
  industry text,
  created_at timestamptz not null default now()
);
create index brands_user_id_idx on public.brands (user_id);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  overall_score int not null check (overall_score between 0 and 100),
  -- {crawl_access: {score, max, detail, ...}, structured_data: {...},
  --  content_signals: {...}, live_visibility: {...}}
  breakdown jsonb not null,
  created_at timestamptz not null default now()
);
create index audits_brand_created_idx on public.audits (brand_id, created_at desc);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  text text not null,
  language text not null check (language in ('en', 'hi', 'hinglish')),
  intent text not null check (intent in ('shortlist', 'comparison', 'pricing', 'local')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index prompts_brand_idx on public.prompts (brand_id);

create table public.monitor_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index monitor_runs_brand_started_idx on public.monitor_runs (brand_id, started_at desc);

create table public.engine_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.monitor_runs (id) on delete cascade,
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  engine text not null check (engine in ('openai', 'anthropic', 'gemini', 'perplexity')),
  mentioned boolean,
  cited boolean,
  position int,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  raw_response text,
  model_version text,
  web_search_used boolean,
  sampled_at timestamptz not null default now()
);
create index engine_results_run_idx on public.engine_results (run_id);
create index engine_results_prompt_idx on public.engine_results (prompt_id);

-- ---------------------------------------------------------------------------
-- Profile bootstrap: create a profile row for every new auth user.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, company_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'company_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ownership helpers
-- ---------------------------------------------------------------------------

create function public.owns_brand(p_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.brands b
    where b.id = p_brand_id and b.user_id = (select auth.uid())
  );
$$;

create function public.owns_run(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.monitor_runs r
    join public.brands b on b.id = r.brand_id
    where r.id = p_run_id and b.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.audits enable row level security;
alter table public.prompts enable row level security;
alter table public.monitor_runs enable row level security;
alter table public.engine_results enable row level security;

create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "brands: own rows" on public.brands
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "audits: via brand" on public.audits
  for all to authenticated
  using (public.owns_brand(brand_id))
  with check (public.owns_brand(brand_id));

create policy "prompts: via brand" on public.prompts
  for all to authenticated
  using (public.owns_brand(brand_id))
  with check (public.owns_brand(brand_id));

create policy "monitor_runs: via brand" on public.monitor_runs
  for all to authenticated
  using (public.owns_brand(brand_id))
  with check (public.owns_brand(brand_id));

-- A result must belong to a run the user owns, and its prompt must belong to
-- the same brand as that run.
create policy "engine_results: via run" on public.engine_results
  for all to authenticated
  using (public.owns_run(run_id))
  with check (
    public.owns_run(run_id)
    and exists (
      select 1 from public.prompts p
      join public.monitor_runs r on r.brand_id = p.brand_id
      where p.id = prompt_id and r.id = run_id
    )
  );

revoke execute on function public.owns_brand(uuid) from public, anon;
revoke execute on function public.owns_run(uuid) from public, anon;
grant execute on function public.owns_brand(uuid) to authenticated;
grant execute on function public.owns_run(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
