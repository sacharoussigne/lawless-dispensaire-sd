import { getChests } from '@/app/_actions/chests';
import ChestsPageClient from './ChestsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function ChestsContent({ dispensarySlug }: { dispensarySlug: string }) {
  const result = await getChests(dispensarySlug);
  
  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const chests = getDataOrThrow(result, 'Erreur lors du chargement des coffres');

  return <ChestsPageClient initialChests={chests} />;
}

export default async function ChestsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <ChestsContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
