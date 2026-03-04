import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { getCompanies } from '@/app/_actions/companies';
import CompanyGroupsPageClient from './CompanyGroupsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CompanyGroupsContent() {
  const [companyGroupsResult, companiesResult] = await Promise.all([
    getCompanyGroups(),
    getCompanies(),
  ]);

  // Lance une erreur si une des réponses est une erreur (sera capturée par error.tsx)
  const companyGroups = getDataOrThrow(companyGroupsResult, 'Erreur lors du chargement des groupes d\'entreprises');
  const companies = getDataOrThrow(companiesResult, 'Erreur lors du chargement des entreprises');

  return (
    <CompanyGroupsPageClient
      initialCompanyGroups={companyGroups}
      initialCompanies={companies}
    />
  );
}

export default function CompanyGroupsPage() {
  return (
    <SuspenseLoader>
      <CompanyGroupsContent />
    </SuspenseLoader>
  );
}
