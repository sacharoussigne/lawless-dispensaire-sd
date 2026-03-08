import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import { getMails } from '@/app/_actions/mails';
import MailsPageClient from './MailsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function MailsContent() {
  const mailTemplatesResult = await getUserMailTemplates();
  const mailsResult = await getMails();

  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des modèles de courriers');
  const mails = getDataOrThrow(mailsResult, 'Erreur lors du chargement des courriers');

  return (
    <MailsPageClient
      initialMailTemplates={mailTemplates}
      initialMails={mails}
    />
  );
}

export default function MailsPage() {
  return (
    <SuspenseLoader>
      <MailsContent />
    </SuspenseLoader>
  );
}
