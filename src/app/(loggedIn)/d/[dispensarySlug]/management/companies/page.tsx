import { getCompanies } from '@/app/_actions/companies';
import CompaniesPageClient from './CompaniesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CompaniesContent({ dispensarySlug }: { dispensarySlug: string }) {
  const companiesResult = await getCompanies(dispensarySlug);

  // Lance une erreur si une des réponses est une erreur (sera capturée par error.tsx)
  const companies = getDataOrThrow(companiesResult, 'Erreur lors du chargement des entreprises');

  return (
    <CompaniesPageClient
      initialCompanies={companies}
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
