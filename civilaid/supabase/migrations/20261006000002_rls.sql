-- CivilAid — Row Level Security
--
-- Rules of thumb:
--   * Every table has RLS on. No policy = no access.
--   * Admins (profiles.role = 'admin') can do everything through the API.
--   * Students read published content metadata, but module bodies, quizzes and videos only
--     when can_access_module() says so, and only ever their own profile, payments and progress.
--   * Signed-out visitors (the 'anon' role) can read nothing.

alter table public.semesters        enable row level security;
alter table public.app_settings     enable row level security;
alter table public.profiles         enable row level security;
alter table public.subjects         enable row level security;
alter table public.lectures         enable row level security;
alter table public.modules          enable row level security;
alter table public.module_content   enable row level security;
alter table public.quiz_questions   enable row level security;
alter table public.payments         enable row level security;
alter table public.module_progress  enable row level security;
alter table public.quiz_attempts    enable row level security;
alter table public.activity_days    enable row level security;

-- ─── Admin: full access everywhere ────────────────────────────────────────────────────
create policy "admin all" on public.semesters       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.app_settings    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.profiles        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.subjects        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.lectures        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.modules         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.module_content  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.quiz_questions  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.payments        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.module_progress for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.quiz_attempts   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.activity_days   for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─── Settings (read-only for students) ────────────────────────────────────────────────
create policy "students read semesters" on public.semesters
  for select to authenticated using (true);

create policy "students read settings" on public.app_settings
  for select to authenticated using (true);

-- ─── Profiles ─────────────────────────────────────────────────────────────────────────
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- Column-level protection lives in the profiles_guard trigger.
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─── Content metadata (published only) ────────────────────────────────────────────────
create policy "read published subjects" on public.subjects
  for select to authenticated using (is_published);

create policy "read published lectures" on public.lectures
  for select to authenticated using (
    is_published
    and exists (select 1 from public.subjects s where s.id = subject_id and s.is_published)
  );

create policy "read published modules" on public.modules
  for select to authenticated using (public.is_module_visible(id));

-- ─── Content bodies (paywalled) ───────────────────────────────────────────────────────
create policy "read unlocked module content" on public.module_content
  for select to authenticated using (public.can_access_module(module_id));

create policy "read unlocked quiz questions" on public.quiz_questions
  for select to authenticated using (public.can_access_module(module_id));

-- ─── Payments ─────────────────────────────────────────────────────────────────────────
create policy "read own payments" on public.payments
  for select to authenticated using (user_id = (select auth.uid()));

-- The payments_prepare trigger overwrites amount, semester and status on insert.
create policy "submit own payment" on public.payments
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and screenshot_path like (select auth.uid())::text || '/%'
  );

-- ─── Progress ─────────────────────────────────────────────────────────────────────────
create policy "read own module progress" on public.module_progress
  for select to authenticated using (user_id = (select auth.uid()));

create policy "insert own module progress" on public.module_progress
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.can_access_module(module_id)
  );

create policy "update own module progress" on public.module_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_access_module(module_id));

create policy "read own quiz attempts" on public.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "insert own quiz attempts" on public.quiz_attempts
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.can_access_module(module_id)
  );

create policy "read own activity days" on public.activity_days
  for select to authenticated using (user_id = (select auth.uid()));

-- ─── Function permissions ─────────────────────────────────────────────────────────────
-- Trigger functions are never called directly.
revoke execute on function public.touch_updated_at()      from public, anon, authenticated;
revoke execute on function public.guard_profile_update()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.create_module_content() from public, anon, authenticated;
revoke execute on function public.prepare_payment()       from public, anon, authenticated;
revoke execute on function public.record_activity_day()   from public, anon, authenticated;

-- Admin-only (also checked inside the function).
revoke execute on function public.review_payment(uuid, boolean, text) from public, anon;
grant  execute on function public.review_payment(uuid, boolean, text) to authenticated;
