import { getLocations } from '@/app/_actions/locations';
import LocationsPageClient from './LocationsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import type { LocationWithCompanies } from '@/types/locations';

async function LocationsContent() {
  const result = await getLocations();

  const locations: LocationWithCompanies[] =
    result.status === 200 && 'data' in result && result.data ? result.data : [];

  return <LocationsPageClient initialLocations={locations} />;
}

export default function LocationsPage() {
  return (
    <SuspenseLoader>
      <LocationsContent />
    </SuspenseLoader>
  );
}
