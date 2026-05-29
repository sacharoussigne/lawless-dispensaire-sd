import { getOrCreateWeek } from '@/app/_actions/privatePractice';
import PrivatePracticePageClient from './PrivatePracticePageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function PrivatePracticeContent({
  dispensarySlug,
  weekDate,
}: {
  dispensarySlug: string;
  weekDate?: string;
}) {
  const date = weekDate ? new Date(weekDate) : new Date();
  const weekResult = await getOrCreateWeek(dispensarySlug, date);
  const week = getDataOrThrow(weekResult, 'Erreur lors du chargement de la semaine');

  return <PrivatePracticePageClient initialWeek={week} />;
}

export default async function PrivatePracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ dispensarySlug: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { dispensarySlug } = await params;
  const { week } = await searchParams;

  return (
    <SuspenseLoader>
      <PrivatePracticeContent dispensarySlug={dispensarySlug} weekDate={week} />
    </SuspenseLoader>
  );
}
