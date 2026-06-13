import { getMailById } from '@/app/_actions/mails';
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
  const mailResult = await getMailById(dispensarySlug, { id: mailId });

  if (mailResult.status === 404) {
    redirect(tenantRoutes(dispensarySlug).employee.mails);
  }

  const mail = getDataOrThrow(mailResult, 'Erreur lors du chargement du courrier');

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
