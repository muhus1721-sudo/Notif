-- CivilAid — core schema
--
-- Content hierarchy:  subjects → lectures → modules → (module_content, quiz_questions)
-- Access model:       a student is "active" while profiles.access_semester_id points at the
--                     current semester and that semester's ends_at is still in the future.
--                     Changing the semester end date therefore moves everyone's expiry at once,
--                     and starting a new semester locks everyone until they pay again.
-- Free content:       the first published lecture of every subject (lowest sort_order).

-- ─── Types ────────────────────────────────────────────────────────────────────────────
create type public.user_role as enum ('student', 'admin');
create type public.payment_status as enum ('pending', 'approved', 'rejected');

-- ─── Shared trigger: keep updated_at fresh ────────────────────────────────────────────
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Semesters & settings ─────────────────────────────────────────────────────────────
create table public.semesters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),   -- e.g. 'Fall 2026'
  ends_at     timestamptz not null,                                       -- access expires here
  price_pkr   integer not null default 1000 check (price_pkr > 0),
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);
-- At most one current semester.
create unique index semesters_single_current on public.semesters (is_current) where is_current;

-- Single-row table for app-wide settings shown on the payment screen.
create table public.app_settings (
  id                      boolean primary key default true check (id),
  payment_account_number  text not null default '',
  payment_account_title   text not null default '',
  payment_methods         text not null default 'JazzCash / Easypaisa',
  updated_at              timestamptz not null default now()
);
insert into public.app_settings default values;

create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- ─── Profiles (one per auth user) ─────────────────────────────────────────────────────
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  full_name           text not null check (char_length(full_name) between 2 and 80),
  -- Nullable so that users created from the Supabase dashboard don't fail; the app requires it.
  cms_id              text unique check (cms_id ~ '^[0-9]{4,10}$'),
  section             text check (char_length(section) between 1 and 10),
  role                public.user_role not null default 'student',
  access_semester_id  uuid references public.semesters (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_access_semester_idx on public.profiles (access_semester_id);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── Role / access helpers (used by RLS) ──────────────────────────────────────────────
-- SECURITY DEFINER so they can read profiles without tripping profiles' own RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- True when the signed-in user may open locked (paid) content.
create function public.has_full_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.semesters s on s.id = p.access_semester_id
    where p.id = (select auth.uid())
      and (p.role = 'admin' or (s.is_current and s.ends_at > now()))
  );
$$;

-- Students may edit their name and section, nothing else. Admin and backend code
-- (SECURITY DEFINER functions, the SQL editor) are not restricted.
create function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.cms_id is distinct from old.cms_id
       or new.role is distinct from old.role
       or new.access_semester_id is distinct from old.access_semester_id then
      raise exception 'Only your name and section can be changed'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Create the profile row from the sign-up metadata the app sends.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, cms_id, section)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'student'), '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'cms_id'), ''),
    nullif(upper(trim(new.raw_user_meta_data ->> 'section')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form say "CMS ID already registered" before creating the account.
create function public.cms_id_available(p_cms_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where cms_id = trim(p_cms_id));
$$;

-- ─── Content ──────────────────────────────────────────────────────────────────────────
create table public.subjects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  code          text,                               -- e.g. 'CE-111'
  description   text not null default '',
  color         text,                               -- optional card accent, '#RRGGBB'
  icon          text,                               -- optional icon name
  sort_order    integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.lectures (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 160),
  description   text not null default '',
  sort_order    integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index lectures_subject_idx on public.lectures (subject_id, sort_order);

-- Module metadata: visible to every signed-in user so locked modules can be listed.
create table public.modules (
  id                uuid primary key default gen_random_uuid(),
  lecture_id        uuid not null references public.lectures (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 160),
  summary           text not null default '',
  sort_order        integer not null default 0,
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index modules_lecture_idx on public.modules (lecture_id, sort_order);

-- Module body: only readable by users allowed to open the module.
create table public.module_content (
  module_id   uuid primary key references public.modules (id) on delete cascade,
  video_path  text,                                  -- object path in the 'videos' bucket
  notes_md    text not null default '',
  updated_at  timestamptz not null default now()
);

create table public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  module_id      uuid not null references public.modules (id) on delete cascade,
  prompt         text not null check (char_length(prompt) > 0),
  options        text[] not null check (cardinality(options) between 2 and 6),
  correct_index  integer not null,
  explanation    text not null default '',
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  check (correct_index >= 0 and correct_index < cardinality(options))
);
create index quiz_questions_module_idx on public.quiz_questions (module_id, sort_order);

create trigger subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();
create trigger lectures_touch before update on public.lectures
  for each row execute function public.touch_updated_at();
create trigger modules_touch before update on public.modules
  for each row execute function public.touch_updated_at();
create trigger module_content_touch before update on public.module_content
  for each row execute function public.touch_updated_at();

-- Every module gets an (empty) content row so the admin editor always has one to update.
create function public.create_module_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.module_content (module_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger modules_create_content after insert on public.modules
  for each row execute function public.create_module_content();

-- ─── Content access helpers ───────────────────────────────────────────────────────────
-- Lecture 1 (first published lecture by sort_order) of every subject is free.
create function public.is_free_lecture(p_lecture_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select l.id = (
    select l2.id from public.lectures l2
    where l2.subject_id = l.subject_id and l2.is_published
    order by l2.sort_order, l2.created_at, l2.id
    limit 1
  )
  from public.lectures l
  where l.id = p_lecture_id;
$$;

-- Module is published all the way up the tree.
create function public.is_module_visible(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.modules m
    join public.lectures l on l.id = m.lecture_id
    join public.subjects s on s.id = l.subject_id
    where m.id = p_module_id and m.is_published and l.is_published and s.is_published
  );
$$;

-- May the signed-in user open this module's video, notes and quiz?
create function public.can_access_module(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or (
        public.is_module_visible(p_module_id)
        and (
          public.has_full_access()
          or public.is_free_lecture((select lecture_id from public.modules where id = p_module_id))
        )
      );
$$;

-- ─── Payments ─────────────────────────────────────────────────────────────────────────
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  semester_id     uuid not null references public.semesters (id),
  amount_pkr      integer not null check (amount_pkr > 0),
  transaction_id  text not null check (char_length(trim(transaction_id)) between 4 and 40),
  screenshot_path text not null,                       -- object path in 'payment-screenshots'
  status          public.payment_status not null default 'pending',
  admin_note      text,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at);
-- The same transaction can't be claimed twice (a rejected one may be resubmitted).
create unique index payments_transaction_unique
  on public.payments (lower(trim(transaction_id))) where status <> 'rejected';
-- One pending request per student at a time.
create unique index payments_one_pending_per_user
  on public.payments (user_id) where status = 'pending';

-- Students can't choose the amount, semester or status: the server fills them in.
create function public.prepare_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semester public.semesters;
begin
  select * into v_semester from public.semesters where is_current limit 1;
  if v_semester.id is null then
    raise exception 'Payments are closed: no semester is open yet';
  end if;

  new.semester_id     := v_semester.id;
  new.amount_pkr      := v_semester.price_pkr;
  new.transaction_id  := trim(new.transaction_id);
  new.status          := 'pending';
  new.admin_note      := null;
  new.reviewed_by     := null;
  new.reviewed_at     := null;
  new.created_at      := now();
  return new;
end;
$$;

create trigger payments_prepare before insert on public.payments
  for each row execute function public.prepare_payment();

-- Admin approves / rejects a payment. Approving activates the student for that semester.
create function public.review_payment(p_payment_id uuid, p_approve boolean, p_note text default null)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review payments' using errcode = '42501';
  end if;

  update public.payments
     set status      = case when p_approve then 'approved' else 'rejected' end::public.payment_status,
         admin_note  = nullif(trim(p_note), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_payment_id
  returning * into v_payment;

  if v_payment.id is null then
    raise exception 'Payment not found';
  end if;

  if p_approve then
    update public.profiles set access_semester_id = v_payment.semester_id
     where id = v_payment.user_id;
  else
    -- Rejecting a previously approved payment takes that semester's access back,
    -- unless the student has another approved payment for it.
    update public.profiles p set access_semester_id = null
     where p.id = v_payment.user_id
       and p.access_semester_id = v_payment.semester_id
       and not exists (
         select 1 from public.payments o
         where o.user_id = p.id and o.semester_id = v_payment.semester_id
           and o.status = 'approved' and o.id <> v_payment.id
       );
  end if;

  return v_payment;
end;
$$;

-- ─── Progress ─────────────────────────────────────────────────────────────────────────
create table public.module_progress (
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  module_id      uuid not null references public.modules (id) on delete cascade,
  video_watched  boolean not null default false,
  notes_read     boolean not null default false,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, module_id)
);
create index module_progress_recent_idx on public.module_progress (user_id, updated_at desc);

create trigger module_progress_touch before update on public.module_progress
  for each row execute function public.touch_updated_at();

create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  module_id   uuid not null references public.modules (id) on delete cascade,
  score       integer not null,
  total       integer not null check (total > 0),
  created_at  timestamptz not null default now(),
  check (score >= 0 and score <= total)
);
create index quiz_attempts_user_module_idx on public.quiz_attempts (user_id, module_id);

-- One row per (student, Pakistan-local day) on which they finished a module or a quiz.
-- Written only by the triggers below; the streak is computed from it.
create table public.activity_days (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null,
  primary key (user_id, day)
);

create function public.record_activity_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nested ifs: PL/pgSQL doesn't short-circuit, and quiz_attempts has no completed_at.
  if tg_table_name = 'module_progress' then
    if new.completed_at is null then
      return new;
    end if;
  end if;
  insert into public.activity_days (user_id, day)
  values (new.user_id, (now() at time zone 'Asia/Karachi')::date)
  on conflict do nothing;
  return new;
end;
$$;

create trigger module_progress_activity after insert or update of completed_at on public.module_progress
  for each row execute function public.record_activity_day();
create trigger quiz_attempts_activity after insert on public.quiz_attempts
  for each row execute function public.record_activity_day();
