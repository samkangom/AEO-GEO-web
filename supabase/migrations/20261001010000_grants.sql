-- Explicit table privileges for signed-in users. Newer Supabase projects can
-- be created without automatic grants on new tables; RLS policies still
-- decide which rows each user can see or change. Anonymous users get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
