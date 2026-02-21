import { getBankAccounts } from '@/app/_actions/bankAccounts';
import BankPageClient from './BankPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function BankContent() {
  const result = await getBankAccounts();
  
  const accounts = getDataOrThrow(result, 'Erreur lors du chargement des comptes bancaires');

  return <BankPageClient initialAccounts={accounts} />;
}

export default function BankPage() {
  return (
    <SuspenseLoader>
      <BankContent />
    </SuspenseLoader>
  );
}
