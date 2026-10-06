-- Sample content for testing Phase 2 against your real Supabase project.
-- Run in Supabase → SQL Editor. Safe to run again (it replaces the sample rows).
-- Remove it later with the DELETE at the bottom.
--
-- Creates "Engineering Mechanics (Sample)" with:
--   Lecture 1 (free)   → 2 modules with notes (incl. formulas) and quizzes
--   Lecture 2 (locked) → 1 module
-- Videos: upload any small .mp4 to Storage → videos → folder named after the module id
-- (e.g. 00000000-0000-4000-a000-000000000101/intro.mp4), then set video_path below.

delete from public.subjects where id = '00000000-0000-4000-a000-000000000001';

insert into public.subjects (id, title, code, description, color, sort_order, is_published) values
  ('00000000-0000-4000-a000-000000000001', 'Engineering Mechanics (Sample)', 'CE-111',
   'Statics of particles and rigid bodies.', '#2563EB', 1, true);

insert into public.lectures (id, subject_id, title, description, sort_order, is_published) values
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-a000-000000000001', 'Forces and Equilibrium', 'Vectors, resultants and free-body diagrams.', 1, true),
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000001', 'Moments and Couples', 'Turning effect of forces.', 2, true);

insert into public.modules (id, lecture_id, title, summary, sort_order, is_published) values
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000011', 'What is a force?', 'Vectors and components', 1, true),
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000011', 'Equilibrium of a particle', 'ΣF = 0', 2, true),
  ('00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000012', 'Moment of a force', 'M = F·d', 1, true);

-- module_content rows are created automatically; fill in the notes.
update public.module_content set notes_md = $md$
A **force** is a push or pull that one body exerts on another. It is a *vector*: it has a magnitude, a direction and a point of application.

In SI units force is measured in newtons, where $1\,\text{N} = 1\,\text{kg·m/s}^2$.

### Resolving a force

A force $F$ at an angle $\theta$ to the $x$-axis has components

$$
F_x = F\cos\theta, \qquad F_y = F\sin\theta
$$

| Quantity | Symbol | Unit |
|---|---|---|
| Force | $F$ | N |
| Mass | $m$ | kg |

> **Tip:** always draw the free-body diagram first.
$md$ where module_id = '00000000-0000-4000-a000-000000000101';

update public.module_content set notes_md = $md$
A particle is in **equilibrium** when the resultant of all forces on it is zero:

$$
\sum F_x = 0, \qquad \sum F_y = 0
$$
$md$ where module_id = '00000000-0000-4000-a000-000000000102';

update public.module_content set notes_md = $md$
The **moment** of a force about a point is $M_O = F\,d$. For a simply supported beam under a uniform load:

$$
M_{\max} = \frac{wL^2}{8}
$$
$md$ where module_id = '00000000-0000-4000-a000-000000000201';

insert into public.quiz_questions (module_id, prompt, options, correct_index, explanation, sort_order) values
  ('00000000-0000-4000-a000-000000000101', 'What is the SI unit of force?', array['Joule', 'Newton', 'Pascal', 'Watt'], 1, 'One newton accelerates 1 kg at 1 m/s².', 1),
  ('00000000-0000-4000-a000-000000000101', 'A $100\,\text{N}$ force acts at $60^\circ$ to the $x$-axis. What is $F_x$?', array['50 N', '86.6 N', '100 N', '57.7 N'], 0, '$F_x = F\cos\theta = 100\cos 60^\circ = 50\,\text{N}$', 2),
  ('00000000-0000-4000-a000-000000000102', 'A particle is in equilibrium when…', array['it is moving', 'the resultant force on it is zero', 'all forces are vertical', 'it has no mass'], 1, 'Equilibrium means $\sum \vec F = 0$.', 1),
  ('00000000-0000-4000-a000-000000000201', 'Maximum moment in a simply supported beam under UDL?', array['$wL/2$', '$wL^2/2$', '$wL^2/8$', '$wL^2/12$'], 2, '$M_{\max} = wL^2/8$, at mid-span.', 1);

-- To attach a video after uploading it:
-- update public.module_content set video_path = '00000000-0000-4000-a000-000000000101/intro.mp4'
--  where module_id = '00000000-0000-4000-a000-000000000101';

-- To remove all sample content (cascades to lectures, modules, notes, quizzes, progress):
-- delete from public.subjects where id = '00000000-0000-4000-a000-000000000001';
