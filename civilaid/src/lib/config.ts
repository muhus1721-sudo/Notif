export const APP_NAME = 'CivilAid';
export const BATCH_LABEL = 'Civil Engineering · NUST · BECE 2K25';

/** Sections offered on the sign-up form. Edit to match your batch. */
export const SECTIONS = ['A', 'B', 'C', 'D'] as const;

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';
export const isSupabaseConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.length > 20;
