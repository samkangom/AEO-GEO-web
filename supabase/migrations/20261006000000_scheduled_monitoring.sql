-- Scheduled weekly monitoring. A daily cron (/api/cron/monitor) runs the
-- monitor for each brand that has it switched on and hasn't had a run in
-- the past week. Runs record whether a person or the schedule started them.
alter table public.brands add column auto_monitor boolean not null default true;
alter table public.monitor_runs
  add column trigger text not null default 'manual'
    check (trigger in ('manual', 'scheduled'));
