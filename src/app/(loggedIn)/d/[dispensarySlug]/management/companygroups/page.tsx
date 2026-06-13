import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { getCompaniesForSelect } from '@/app/_actions/companies';
import CompanyGroupsPageClient from './CompanyGroupsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CompanyGroupsContent({ dispensarySlug }: { dispensarySlug: string }) {
  const [companyGroupsResult, companiesResult] = await Promise.all([
    getCompanyGroups(dispensarySlug),
    getCompaniesForSelect(dispensarySlug),
  ]);

  const companyGroups = getDataOrThrow(companyGroupsResult, 'Erreur lors du chargement des groupes d\'entreprises');
  const companies = getDataOrThrow(companiesResult, 'Erreur lors du chargement des entreprises');

  return (
    <CompanyGroupsPageClient
      initialCompanyGroups={companyGroups}
      initialCompanies={companies}
    />
  );
}

export default async function CompanyGroupsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <CompanyGroupsContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
