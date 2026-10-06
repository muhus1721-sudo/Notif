import { ComingSoon } from '@/components/ComingSoon';
import { AppText, Screen } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';

export default function AdminHomeScreen() {
  const { profile } = useAuth();
  return (
    <Screen edges={[]}>
      <AppText variant="title">Hi {profile?.full_name.split(' ')[0]}, you’re an admin</AppText>
      <ComingSoon
        icon="shield-checkmark-outline"
        title="Admin tools are coming"
        message="Payment approvals, user management and content management will live here."
      />
    </Screen>
  );
}
