import { getBankAccounts } from '@/app/_actions/bankAccounts';
import BankPageClient from './BankPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function BankContent({ dispensarySlug }: { dispensarySlug: string }) {
  const result = await getBankAccounts(dispensarySlug);
  
  const accounts = getDataOrThrow(result, 'Erreur lors du chargement des comptes bancaires');

  return <BankPageClient initialAccounts={accounts} />;
}

export default async function BankPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <BankContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
