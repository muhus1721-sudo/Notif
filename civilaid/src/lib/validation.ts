import { SECTIONS } from './config';

export type SignUpInput = {
  fullName: string;
  cmsId: string;
  section: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignUpErrors = Partial<Record<keyof SignUpInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email';
  if (!EMAIL_RE.test(email.trim())) return 'That email doesn’t look right';
}

export function validateSignUp(input: SignUpInput): SignUpErrors {
  const errors: SignUpErrors = {};
  const name = input.fullName.trim();
  if (name.length < 2) errors.fullName = 'Enter your full name';
  else if (name.length > 80) errors.fullName = 'Name is too long';
  else if (!/^[\p{L} .'-]+$/u.test(name)) errors.fullName = 'Use letters only';

  const cms = input.cmsId.trim();
  if (!cms) errors.cmsId = 'Enter your CMS ID';
  else if (!/^[0-9]{4,10}$/.test(cms)) errors.cmsId = 'CMS ID should be digits only';

  if (!(SECTIONS as readonly string[]).includes(input.section)) errors.section = 'Pick your section';

  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;

  if (input.password.length < 8) errors.password = 'Use at least 8 characters';
  if (input.confirmPassword !== input.password) errors.confirmPassword = 'Passwords don’t match';
  return errors;
}

/** Turns Supabase/network errors into sentences a student can act on. */
export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Wrong email or password.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email first — check your inbox.';
  if (lower.includes('already registered') || lower.includes('already been registered'))
    return 'An account with this email already exists. Try signing in.';
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (lower.includes('network') || lower.includes('failed to fetch'))
    return 'Can’t reach the server. Check your internet connection.';
  if (lower.includes('database error saving new user'))
    return 'Couldn’t create your profile. This CMS ID may already be registered.';
  if (lower.includes('password')) return message;
  return message || 'Something went wrong. Please try again.';
}
