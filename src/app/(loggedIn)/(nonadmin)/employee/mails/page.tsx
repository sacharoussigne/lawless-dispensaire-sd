import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import { getMails } from '@/app/_actions/mails';
import UserMailTemplatesPageClient from './UserMailTemplatesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function UserMailTemplatesContent() {
  const mailTemplatesResult = await getUserMailTemplates();
  const mailsResult = await getMails();

  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des modèles de courriers');
  const mails = getDataOrThrow(mailsResult, 'Erreur lors du chargement des courriers');

  return (
    <UserMailTemplatesPageClient
      initialMailTemplates={mailTemplates}
      initialMails={mails}
    />
  );
}

export default function UserMailTemplatesPage() {
  return (
    <SuspenseLoader>
      <UserMailTemplatesContent />
    </SuspenseLoader>
  );
}
