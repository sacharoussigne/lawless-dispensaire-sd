import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { getCompanies } from '@/app/_actions/companies';
import CompanyGroupsPageClient from './CompanyGroupsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import type { CompanyGroupWithRelations, CompanyWithRelations } from '@/types/companyGroups';

async function CompanyGroupsContent() {
  const [companyGroupsResult, companiesResult] = await Promise.all([
    getCompanyGroups(),
    getCompanies(),
  ]);

  const companyGroups: CompanyGroupWithRelations[] =
    companyGroupsResult.status === 200 && 'data' in companyGroupsResult && companyGroupsResult.data
      ? companyGroupsResult.data
      : [];

  const companies: CompanyWithRelations[] =
    companiesResult.status === 200 && 'data' in companiesResult && companiesResult.data
      ? companiesResult.data
      : [];

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
