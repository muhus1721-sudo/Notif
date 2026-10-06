export type UserRole = 'student' | 'admin';

export type Semester = {
  id: string;
  name: string;
  ends_at: string;
  price_pkr: number;
  is_current: boolean;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  cms_id: string | null;
  section: string | null;
  role: UserRole;
  access_semester_id: string | null;
  created_at: string;
  /** Joined from semesters via access_semester_id. */
  access_semester: Pick<Semester, 'id' | 'name' | 'ends_at' | 'is_current'> | null;
};
