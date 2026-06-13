import { getCompanies } from '@/app/_actions/companies';
import { getCompanyGroupsForSelect } from '@/app/_actions/companyGroups';
import CompaniesPageClient from './CompaniesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CompaniesContent({ dispensarySlug }: { dispensarySlug: string }) {
  const [companiesResult, companyGroupsResult] = await Promise.all([
    getCompanies(dispensarySlug),
    getCompanyGroupsForSelect(dispensarySlug),
  ]);

  const companies = getDataOrThrow(companiesResult, 'Erreur lors du chargement des entreprises');
  const companyGroups = getDataOrThrow(
    companyGroupsResult,
    'Erreur lors du chargement des groupes d\'entreprises',
  );

  return (
    <CompaniesPageClient
      initialCompanies={companies}
      initialCompanyGroups={companyGroups}
    />
  );
}

export default async function CompaniesPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <CompaniesContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
