import { getBankAccount, getOrCreateWeek } from '@/app/_actions/bankAccounts';
import BankAccountPageClient from './BankAccountPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function BankAccountContent({
  dispensarySlug,
  accountId,
  weekDate,
}: {
  dispensarySlug: string;
  accountId: string;
  weekDate?: string;
}) {
  const accountResult = await getBankAccount(dispensarySlug, accountId);
  const account = getDataOrThrow(accountResult, 'Erreur lors du chargement du compte bancaire');

  const date = weekDate ? new Date(weekDate) : new Date();
  const weekResult = await getOrCreateWeek(dispensarySlug, accountId, date);
  const week = getDataOrThrow(weekResult, 'Erreur lors du chargement de la semaine');

  return <BankAccountPageClient account={account} initialWeek={week} />;
}

export default async function BankAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ dispensarySlug: string; accountId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { dispensarySlug, accountId } = await params;
  const { week } = await searchParams;

  return (
    <SuspenseLoader>
      <BankAccountContent dispensarySlug={dispensarySlug} accountId={accountId} weekDate={week} />
    </SuspenseLoader>
  );
}
