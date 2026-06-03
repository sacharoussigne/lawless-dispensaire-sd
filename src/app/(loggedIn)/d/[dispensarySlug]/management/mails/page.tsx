import { getMailTemplates } from '@/app/_actions/mailTemplates';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import MailTemplatesPageClient from './MailTemplatesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function MailTemplatesContent({ dispensarySlug }: { dispensarySlug: string }) {
  const mailTemplatesResult = await getMailTemplates(dispensarySlug);
  const assignmentsResult = await getOrderLetterTemplateAssignments(dispensarySlug);

  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des modèles de courriers');
  const assignments = getDataOrThrow(assignmentsResult, 'Erreur lors du chargement des assignations');

  return (
    <MailTemplatesPageClient
      initialMailTemplates={mailTemplates}
      initialAssignments={assignments}
    />
  );
}

export default async function MailTemplatesPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <MailTemplatesContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
