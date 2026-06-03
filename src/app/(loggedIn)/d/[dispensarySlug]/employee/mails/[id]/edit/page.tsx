import { getMails } from '@/app/_actions/mails';
import EditMailPageClient from './EditMailPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

async function EditMailContent({
  dispensarySlug,
  mailId,
}: {
  dispensarySlug: string;
  mailId: string;
}) {
  const mailsResult = await getMails(dispensarySlug);
  const mails = getDataOrThrow(mailsResult, 'Erreur lors du chargement des courriers');

  const mail = mails.find((m) => m.id === mailId);

  if (!mail) {
    redirect(tenantRoutes(dispensarySlug).employee.mails);
  }

  return <EditMailPageClient mail={mail} />;
}

export default async function EditMailPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string; id: string }>;
}) {
  const { dispensarySlug, id } = await params;

  return (
    <SuspenseLoader>
      <EditMailContent dispensarySlug={dispensarySlug} mailId={id} />
    </SuspenseLoader>
  );
}
