import { ComingSoon } from '@/components/ComingSoon';
import { AppText, Screen } from '@/components/ui';

export default function SubjectsScreen() {
  return (
    <Screen>
      <AppText variant="title">Subjects</AppText>
      <ComingSoon
        icon="book-outline"
        title="No subjects yet"
        message="Subjects, lectures and modules will appear here once content is published."
      />
    </Screen>
  );
}
