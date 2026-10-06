import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/ui';

// Phase 3 replaces this with the payment screen (number, amount, screenshot + transaction ID).
export default function UnlockScreen() {
  return (
    <Screen edges={['bottom']}>
      <ComingSoon
        icon="card-outline"
        title="Payments are coming soon"
        message="You’ll pay Rs 1000 by JazzCash or Easypaisa here, upload the screenshot, and get access once it’s approved."
      />
    </Screen>
  );
}
