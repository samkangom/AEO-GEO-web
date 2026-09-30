-- Row-level security tests. Runs inside a transaction and rolls back, so it
-- leaves no data behind. Any failed assertion aborts with a non-zero exit.
--
--   npm run test:db            (uses $DATABASE_URL, default: local Supabase)
--
-- Two users: A owns a brand with data in every table; B must not be able to
-- read, write, or attach anything to it.

\set ON_ERROR_STOP 1
\set QUIET 1
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'rls-a@test.local', '{"company_name":"Acme"}'),
  ('00000000-0000-0000-0000-00000000000b', 'rls-b@test.local', '{}');

do $$ begin
  assert (select company_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Acme',
    'profile trigger should copy company_name';
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 1,
    'profile trigger should create a row for every user';
end $$;

-- ---------------------------------------------------------------- user A
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

insert into public.brands (id, user_id, name, url)
  values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Acme', 'https://acme.in');
insert into public.audits (brand_id, overall_score, breakdown)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 42, '{}');
insert into public.prompts (id, brand_id, text, language, intent)
  values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000001', 'best CRM in Pune', 'en', 'local');
insert into public.monitor_runs (id, brand_id)
  values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.engine_results (run_id, prompt_id, engine, mentioned)
  values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'openai', true);

do $$ begin
  assert (select count(*) from public.brands) = 1, 'A should see own brand';
  assert (select count(*) from public.engine_results) = 1, 'A should see own engine result';
end $$;

-- ---------------------------------------------------------------- user B
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

do $$ begin
  assert (select count(*) from public.brands) = 0, 'B must not see A''s brands';
  assert (select count(*) from public.audits) = 0, 'B must not see A''s audits';
  assert (select count(*) from public.prompts) = 0, 'B must not see A''s prompts';
  assert (select count(*) from public.monitor_runs) = 0, 'B must not see A''s runs';
  assert (select count(*) from public.engine_results) = 0, 'B must not see A''s results';
  assert (select count(*) from public.profiles) = 1, 'B must only see own profile';
end $$;

-- Writes to A's rows are silently filtered (0 rows), never applied.
update public.brands set name = 'pwned' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.audits where brand_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Inserts that point at A's data must be rejected outright.
do $$
declare
  attempts text[] := array[
    $q$insert into public.brands (user_id, name, url) values ('00000000-0000-0000-0000-00000000000a', 'x', 'https://x.in')$q$,
    $q$insert into public.audits (brand_id, overall_score, breakdown) values ('aaaaaaaa-0000-0000-0000-000000000001', 1, '{}')$q$,
    $q$insert into public.prompts (brand_id, text, language, intent) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'en', 'local')$q$,
    $q$insert into public.monitor_runs (brand_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$q$,
    $q$insert into public.engine_results (run_id, prompt_id, engine) values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'openai')$q$
  ];
  q text;
begin
  foreach q in array attempts loop
    begin
      execute q;
      raise exception 'B should not be allowed: %', q;
    exception when insufficient_privilege then
      null; -- expected: RLS violation (42501)
    end;
  end loop;
end $$;

-- B's own run must not reference A's prompt (cross-brand result).
insert into public.brands (id, user_id, name, url)
  values ('bbbbbbbb-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Beta', 'https://beta.in');
insert into public.monitor_runs (id, brand_id)
  values ('bbbbbbbb-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-000000000001');
do $$ begin
  begin
    insert into public.engine_results (run_id, prompt_id, engine)
      values ('bbbbbbbb-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'openai');
    raise exception 'engine_results must reject a prompt from another brand';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- ---------------------------------------------------------------- anon
set local role anon;
do $$ begin
  begin
    assert (select count(*) from public.brands) = 0, 'anon must not see brands';
  exception when insufficient_privilege then
    null; -- also acceptable: no table grant at all
  end;
end $$;

-- ---------------------------------------------------------------- verify A's data untouched
reset role;
do $$ begin
  assert (select name from public.brands where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Acme',
    'B''s update must not change A''s brand';
  assert (select count(*) from public.audits where brand_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1,
    'B''s delete must not remove A''s audit';
end $$;

rollback;
\echo 'RLS tests passed'
