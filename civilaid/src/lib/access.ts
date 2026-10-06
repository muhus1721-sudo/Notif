import type { Profile } from './types';

export type AccessStatus =
  | { kind: 'admin' }
  | { kind: 'active'; expiresAt: Date; semesterName: string }
  | { kind: 'expired'; expiredAt: Date; semesterName: string }
  | { kind: 'inactive' };

/** Mirrors public.has_full_access() in the database, for display only. */
export function getAccessStatus(profile: Profile, now: Date = new Date()): AccessStatus {
  if (profile.role === 'admin') return { kind: 'admin' };
  const semester = profile.access_semester;
  if (!semester) return { kind: 'inactive' };
  const endsAt = new Date(semester.ends_at);
  if (semester.is_current && endsAt > now) {
    return { kind: 'active', expiresAt: endsAt, semesterName: semester.name };
  }
  return { kind: 'expired', expiredAt: endsAt, semesterName: semester.name };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Can open every lecture (not just the free first one). */
export function hasFullAccess(profile: Profile | null): boolean {
  if (!profile) return false;
  const kind = getAccessStatus(profile).kind;
  return kind === 'admin' || kind === 'active';
}
