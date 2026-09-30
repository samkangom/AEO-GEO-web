-- Store failed engine calls honestly (mentioned stays null and `error` says
-- why), and keep the sources each answer cited so `cited` is traceable.
alter table public.engine_results
  add column error text,
  add column citations jsonb not null default '[]'::jsonb;

-- A result is either a measured answer or a recorded failure.
alter table public.engine_results
  add constraint engine_results_measured_or_error
  check ((error is null) = (mentioned is not null));
