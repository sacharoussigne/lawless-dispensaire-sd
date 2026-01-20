import { getCompanies } from '@/app/_actions/companies';
import { getLocations } from '@/app/_actions/locations';
import CompaniesPageClient from './CompaniesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import type { CompanyWithRelations, Location } from '@/types/companies';

async function CompaniesContent() {
  const [companiesResult, locationsResult] = await Promise.all([
    getCompanies(),
    getLocations(),
  ]);

  const companies: CompanyWithRelations[] =
    companiesResult.status === 200 && 'data' in companiesResult && companiesResult.data
      ? companiesResult.data
      : [];

  const locations: Location[] =
    locationsResult.status === 200 && 'data' in locationsResult && locationsResult.data
      ? locationsResult.data
      : [];

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
