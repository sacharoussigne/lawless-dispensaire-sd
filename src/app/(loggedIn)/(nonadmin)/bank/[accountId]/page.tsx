import { getBankAccount, getOrCreateWeek } from '@/app/_actions/bankAccounts';
import BankAccountPageClient from './BankAccountPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

async function BankAccountContent({ accountId, weekDate }: { accountId: string; weekDate?: string }) {
  const accountResult = await getBankAccount(accountId);
  const account = getDataOrThrow(accountResult, 'Erreur lors du chargement du compte bancaire');

  const date = weekDate ? new Date(weekDate) : new Date();
  const weekResult = await getOrCreateWeek(accountId, date);
  const week = getDataOrThrow(weekResult, 'Erreur lors du chargement de la semaine');

  return <BankAccountPageClient account={account} initialWeek={week} />;
}

export default async function BankAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { accountId } = await params;
  const { week } = await searchParams;

  return (
    <SuspenseLoader>
      <BankAccountContent accountId={accountId} weekDate={week} />
    </SuspenseLoader>
  );
}
