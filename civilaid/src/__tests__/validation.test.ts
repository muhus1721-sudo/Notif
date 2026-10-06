import { friendlyAuthError, validateSignUp, type SignUpInput } from '@/lib/validation';

const valid: SignUpInput = {
  fullName: 'Ali Raza',
  cmsId: '512345',
  section: 'A',
  email: 'ali@example.com',
  password: 'longenough',
  confirmPassword: 'longenough',
};

describe('validateSignUp', () => {
  it('accepts a complete form', () => {
    expect(validateSignUp(valid)).toEqual({});
  });

  it('flags every missing field', () => {
    const errors = validateSignUp({ fullName: '', cmsId: '', section: '', email: '', password: '', confirmPassword: 'x' });
    expect(Object.keys(errors).sort()).toEqual(['cmsId', 'confirmPassword', 'email', 'fullName', 'password', 'section']);
  });

  it('requires a numeric CMS ID', () => {
    expect(validateSignUp({ ...valid, cmsId: '12ab' }).cmsId).toBeDefined();
    expect(validateSignUp({ ...valid, cmsId: '123' }).cmsId).toBeDefined();
  });

  it('accepts names with apostrophes and non-English letters', () => {
    expect(validateSignUp({ ...valid, fullName: "Muhammad O'Neil" }).fullName).toBeUndefined();
    expect(validateSignUp({ ...valid, fullName: 'علی رضا' }).fullName).toBeUndefined();
  });

  it('rejects an unknown section and mismatched passwords', () => {
    expect(validateSignUp({ ...valid, section: 'Z' }).section).toBeDefined();
    expect(validateSignUp({ ...valid, confirmPassword: 'different' }).confirmPassword).toBeDefined();
  });
});

describe('friendlyAuthError', () => {
  it('rewrites common Supabase messages', () => {
    expect(friendlyAuthError(new Error('Invalid login credentials'))).toBe('Wrong email or password.');
    expect(friendlyAuthError(new Error('User already registered'))).toMatch(/already exists/);
    expect(friendlyAuthError(new Error('TypeError: Network request failed'))).toMatch(/internet/);
  });
});
