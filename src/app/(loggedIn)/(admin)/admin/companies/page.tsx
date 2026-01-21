import { getCompanies } from '@/app/_actions/companies';
import { getLocations } from '@/app/_actions/locations';
import CompaniesPageClient from './CompaniesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CompaniesContent() {
  const [companiesResult, locationsResult] = await Promise.all([
    getCompanies(),
    getLocations(),
  ]);

  // Lance une erreur si une des réponses est une erreur (sera capturée par error.tsx)
  const companies = getDataOrThrow(companiesResult, 'Erreur lors du chargement des entreprises');
  const locations = getDataOrThrow(locationsResult, 'Erreur lors du chargement des emplacements');

  return (
    <CompaniesPageClient
      initialCompanies={companies}
      initialLocations={locations}
    />
  );
}

export default function CompaniesPage() {
  return (
    <SuspenseLoader>
      <CompaniesContent />
    </SuspenseLoader>
  );
}
