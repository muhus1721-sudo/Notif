// Sample content for demo mode (an APK built without Supabase keys). Lives in memory only.
import type {
  LectureDetail,
  ModuleDetail,
  ModuleMeta,
  ModuleProgress,
  QuizQuestion,
  SubjectWithLectures,
} from './content';

// A short public sample clip, so the video player can be tried in demo mode.
const SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

type DemoModule = ModuleMeta & { notes: string; video: string | null; quiz: Omit<QuizQuestion, 'id'>[] };

const NOTES_FORCE = String.raw`## What is a force?

A **force** is a push or pull that one body exerts on another. It is a *vector*: it has a magnitude, a direction and a point of application.

In SI units force is measured in newtons, where $1\,\text{N} = 1\,\text{kg·m/s}^2$.

### Resolving a force

A force $F$ acting at an angle $\theta$ to the $x$-axis has components

$$
F_x = F\cos\theta, \qquad F_y = F\sin\theta
$$

and its magnitude can be recovered with $F = \sqrt{F_x^2 + F_y^2}$.

| Quantity | Symbol | Unit |
|---|---|---|
| Force | $F$ | N |
| Mass | $m$ | kg |
| Acceleration | $a$ | m/s² |

> **Tip:** always draw the free-body diagram before writing any equation.

1. Isolate the body.
2. Show every external force.
3. Choose axes that make the algebra easy.
`;

const NOTES_EQUILIBRIUM = String.raw`## Equilibrium of a particle

A particle is in **equilibrium** when the resultant of all forces on it is zero:

$$
\sum \vec F = 0 \quad\Longrightarrow\quad \sum F_x = 0,\; \sum F_y = 0
$$

### Worked example

A $500\,\text{N}$ lamp hangs from two cables at $30^\circ$ and $45^\circ$ to the horizontal. Writing $\sum F_x = 0$ and $\sum F_y = 0$ gives two equations in the two cable tensions $T_1$ and $T_2$:

- $T_2\cos45^\circ - T_1\cos30^\circ = 0$
- $T_1\sin30^\circ + T_2\sin45^\circ = 500$

Solving: $T_1 \approx 366\,\text{N}$ and $T_2 \approx 448\,\text{N}$.
`;

const NOTES_MOMENT = String.raw`## Moment of a force

The **moment** of a force about a point $O$ measures its tendency to rotate a body about $O$:

$$
M_O = F\,d
$$

where $d$ is the perpendicular distance from $O$ to the line of action of $F$. Counter-clockwise moments are usually taken as positive.

For a simply supported beam of span $L$ under a uniform load $w$, the largest bending moment is at mid-span:

$$
M_{\max} = \frac{wL^2}{8}
$$
`;

const NOTES_STRESS = String.raw`## Normal stress

When an axial load $P$ acts on a bar of cross-sectional area $A$, the **normal stress** is

$$
\sigma = \frac{P}{A}
$$

Stress has units of pressure: $1\,\text{MPa} = 1\,\text{N/mm}^2$.

### Strain and Hooke's law

Normal strain is the change in length per unit length, $\varepsilon = \dfrac{\delta}{L}$. In the elastic range, $\sigma = E\,\varepsilon$, so the elongation of a bar is

$$
\delta = \frac{PL}{AE}
$$
`;

const subjects: SubjectWithLectures[] = [
  {
    id: 'demo-s1', title: 'Engineering Mechanics', code: 'CE-111', description: 'Statics of particles and rigid bodies.',
    color: '#2563EB', sort_order: 1, is_published: true,
    lectures: [
      { id: 'demo-l1', subject_id: 'demo-s1', title: 'Forces and Equilibrium', description: 'Vectors, resultants and free-body diagrams.', sort_order: 1, created_at: '', is_published: true, module_ids: ['demo-m1', 'demo-m2'] },
      { id: 'demo-l2', subject_id: 'demo-s1', title: 'Moments and Couples', description: 'Turning effect of forces.', sort_order: 2, created_at: '', is_published: true, module_ids: ['demo-m3'] },
    ],
  },
  {
    id: 'demo-s2', title: 'Mechanics of Solids', code: 'CE-212', description: 'Stress, strain and deformation.',
    color: '#0EA5E9', sort_order: 2, is_published: true,
    lectures: [
      { id: 'demo-l3', subject_id: 'demo-s2', title: 'Stress and Strain', description: 'Axial loading and Hooke’s law.', sort_order: 1, created_at: '', is_published: true, module_ids: ['demo-m4'] },
      { id: 'demo-l4', subject_id: 'demo-s2', title: 'Torsion', description: 'Shafts under twisting moments.', sort_order: 2, created_at: '', is_published: true, module_ids: [] },
    ],
  },
];

const modules: DemoModule[] = [
  {
    id: 'demo-m1', lecture_id: 'demo-l1', title: 'What is a force?', summary: 'Vectors and components', sort_order: 1, duration_seconds: 15, is_published: true,
    notes: NOTES_FORCE, video: SAMPLE_VIDEO,
    quiz: [
      { prompt: 'What is the SI unit of force?', options: ['Joule', 'Newton', 'Pascal', 'Watt'], correct_index: 1, explanation: 'One newton accelerates 1 kg at 1 m/s².' },
      { prompt: 'A 100 N force acts at 60° to the x-axis. What is its x-component?', options: ['50 N', '86.6 N', '100 N', '57.7 N'], correct_index: 0, explanation: 'Fx = F cos θ = 100 × cos 60° = 50 N.' },
    ],
  },
  {
    id: 'demo-m2', lecture_id: 'demo-l1', title: 'Equilibrium of a particle', summary: 'ΣF = 0', sort_order: 2, duration_seconds: null, is_published: true,
    notes: NOTES_EQUILIBRIUM, video: null,
    quiz: [
      { prompt: 'A particle is in equilibrium when…', options: ['it is moving', 'the resultant force on it is zero', 'all forces are vertical', 'it has no mass'], correct_index: 1, explanation: 'Equilibrium means ΣF = 0 (it may still move at constant velocity).' },
    ],
  },
  {
    id: 'demo-m3', lecture_id: 'demo-l2', title: 'Moment of a force', summary: 'M = F·d', sort_order: 1, duration_seconds: 15, is_published: true,
    notes: NOTES_MOMENT, video: SAMPLE_VIDEO,
    quiz: [
      { prompt: 'Maximum moment in a simply supported beam under UDL w over span L?', options: ['wL/2', 'wL²/2', 'wL²/8', 'wL²/12'], correct_index: 2, explanation: 'M_max = wL²/8, at mid-span.' },
    ],
  },
  {
    id: 'demo-m4', lecture_id: 'demo-l3', title: 'Normal stress', summary: 'σ = P/A', sort_order: 1, duration_seconds: null, is_published: true,
    notes: NOTES_STRESS, video: null,
    quiz: [
      { prompt: 'A 10 kN load acts on a 100 mm² bar. What is the stress?', options: ['10 MPa', '100 MPa', '1 MPa', '1000 MPa'], correct_index: 1, explanation: 'σ = 10 000 N / 100 mm² = 100 N/mm² = 100 MPa.' },
    ],
  },
];

let fullAccess = false;
/** Demo admins see everything; demo students only see Lecture 1 of each subject. */
export function setDemoFullAccess(value: boolean) {
  fullAccess = value;
}

const progress = new Map<string, ModuleProgress>();
const attempts = new Map<string, { score: number; total: number }[]>();

export function listSubjects(): SubjectWithLectures[] {
  return subjects;
}

export function getLecture(id: string): LectureDetail | null {
  const subject = subjects.find((s) => s.lectures.some((l) => l.id === id));
  const lecture = subject?.lectures.find((l) => l.id === id);
  if (!subject || !lecture) return null;
  return { subject, lecture, modules: modules.filter((m) => m.lecture_id === id) };
}

export function getModule(id: string): ModuleDetail | null {
  const m = modules.find((x) => x.id === id);
  const lecture = m && getLecture(m.lecture_id);
  if (!m || !lecture) return null;
  const unlocked = fullAccess || lecture.subject.lectures[0]?.id === m.lecture_id;
  const { notes, video, quiz, ...meta } = m;
  return {
    ...lecture,
    module: meta,
    body: unlocked ? { notes_md: notes, video_path: video } : null,
    questions: unlocked ? quiz.map((q, i) => ({ ...q, id: `${id}-q${i}` })) : [],
  };
}

export function getProgress(): ModuleProgress[] {
  return [...progress.values()];
}

export function saveProgress(row: ModuleProgress) {
  progress.set(row.module_id, row);
}

export function getAttempts(moduleId: string) {
  return attempts.get(moduleId) ?? [];
}

export function saveAttempt(moduleId: string, score: number, total: number) {
  attempts.set(moduleId, [...getAttempts(moduleId), { score, total }]);
}
