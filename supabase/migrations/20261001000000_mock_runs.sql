-- Runs made in MOCK_AI_RESPONSES mode (simulated answers) are flagged so the
-- UI can label them and they're never mistaken for real AI results.
alter table public.monitor_runs add column mock boolean not null default false;
