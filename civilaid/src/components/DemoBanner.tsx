import { isSupabaseConfigured } from '@/lib/config';
import { Banner } from './ui';

/** Shown on the auth screens when the build has no Supabase keys. */
export function DemoBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <Banner
      tone="info"
      message="Demo mode — not connected to Supabase yet. Any email and password works; nothing is saved. Use an email starting with “admin” to preview the admin panel."
    />
  );
}
