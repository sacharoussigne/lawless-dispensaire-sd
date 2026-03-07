import { getOrCreateWeek } from '@/app/_actions/privatePractice';
import PrivatePracticePageClient from './PrivatePracticePageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function PrivatePracticeContent({ weekDate }: { weekDate?: string }) {
  const date = weekDate ? new Date(weekDate) : new Date();
  const weekResult = await getOrCreateWeek(date);
  const week = getDataOrThrow(weekResult, 'Erreur lors du chargement de la semaine');

  return <PrivatePracticePageClient initialWeek={week} />;
}

export default async function PrivatePracticePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  return (
    <SuspenseLoader>
      <PrivatePracticeContent weekDate={week} />
    </SuspenseLoader>
  );
}
