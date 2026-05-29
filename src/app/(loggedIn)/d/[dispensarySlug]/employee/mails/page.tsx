import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import { getMails } from '@/app/_actions/mails';
import MailsPageClient from './MailsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function MailsContent({ dispensarySlug }: { dispensarySlug: string }) {
  const mailTemplatesResult = await getUserMailTemplates(dispensarySlug);
  const mailsResult = await getMails(dispensarySlug);

  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des modèles de courriers');
  const mails = getDataOrThrow(mailsResult, 'Erreur lors du chargement des courriers');

  return (
    <MailsPageClient
      initialMailTemplates={mailTemplates}
      initialMails={mails}
    />
  );
}

export default async function MailsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <MailsContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
