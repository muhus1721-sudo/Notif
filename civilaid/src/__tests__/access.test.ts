import { getAccessStatus } from '@/lib/access';
import type { Profile } from '@/lib/types';

const now = new Date('2026-10-06T10:00:00Z');
const base: Profile = {
  id: 'u1',
  email: 'a@b.c',
  full_name: 'Ali',
  cms_id: '512345',
  section: 'A',
  role: 'student',
  access_semester_id: null,
  created_at: now.toISOString(),
  access_semester: null,
};
const semester = { id: 's1', name: 'Fall 2026', ends_at: '2027-01-31T19:00:00Z', is_current: true };

describe('getAccessStatus', () => {
  it('is inactive with no paid semester', () => {
    expect(getAccessStatus(base, now).kind).toBe('inactive');
  });

  it('is active before the current semester ends', () => {
    const status = getAccessStatus({ ...base, access_semester_id: 's1', access_semester: semester }, now);
    expect(status).toMatchObject({ kind: 'active', semesterName: 'Fall 2026' });
  });

  it('expires after the end date or when the semester is no longer current', () => {
    const past = { ...semester, ends_at: '2026-10-01T00:00:00Z' };
    expect(getAccessStatus({ ...base, access_semester: past }, now).kind).toBe('expired');
    expect(getAccessStatus({ ...base, access_semester: { ...semester, is_current: false } }, now).kind).toBe('expired');
  });

  it('treats admins as always active', () => {
    expect(getAccessStatus({ ...base, role: 'admin' }, now).kind).toBe('admin');
  });
});
