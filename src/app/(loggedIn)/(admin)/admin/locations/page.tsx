import { getLocations } from '@/app/_actions/locations';
import LocationsPageClient from './LocationsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function LocationsContent() {
  const result = await getLocations();

  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const locations = getDataOrThrow(result, 'Erreur lors du chargement des emplacements');

  return <LocationsPageClient initialLocations={locations} />;
}

export default function LocationsPage() {
  return (
    <SuspenseLoader>
      <LocationsContent />
    </SuspenseLoader>
  );
}
