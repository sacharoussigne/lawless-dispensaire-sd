import { getMails } from '@/app/_actions/mails';
import EditMailPageClient from './EditMailPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

async function EditMailContent({ mailId }: { mailId: string }) {
  const mailsResult = await getMails();
  const mails = getDataOrThrow(mailsResult, 'Erreur lors du chargement des courriers');
  
  const mail = mails.find((m) => m.id === mailId);
  
  if (!mail) {
    redirect(routes.employee.mails);
  }

  return <EditMailPageClient mail={mail} />;
}

export default async function EditMailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SuspenseLoader>
      <EditMailContent mailId={id} />
    </SuspenseLoader>
  );
}
