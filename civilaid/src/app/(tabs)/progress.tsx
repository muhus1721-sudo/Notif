import { ComingSoon } from '@/components/ComingSoon';
import { AppText, Screen } from '@/components/ui';

export default function ProgressScreen() {
  return (
    <Screen>
      <AppText variant="title">Progress</AppText>
      <ComingSoon
        icon="stats-chart-outline"
        title="Nothing to show yet"
        message="Finish a module or quiz and your progress, quiz averages and streak will appear here."
      />
    </Screen>
  );
}
