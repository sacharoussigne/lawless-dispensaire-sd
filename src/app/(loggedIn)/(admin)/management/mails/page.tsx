import { getMailTemplates } from '@/app/_actions/mailTemplates';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import MailTemplatesPageClient from './MailTemplatesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function MailTemplatesContent() {
  const mailTemplatesResult = await getMailTemplates();
  const assignmentsResult = await getOrderLetterTemplateAssignments();

  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des modèles de courriers');
  const assignments = getDataOrThrow(assignmentsResult, 'Erreur lors du chargement des assignations');

  return (
    <MailTemplatesPageClient
      initialMailTemplates={mailTemplates}
      initialAssignments={assignments}
    />
  );
}

export default function MailTemplatesPage() {
  return (
    <SuspenseLoader>
      <MailTemplatesContent />
    </SuspenseLoader>
  );
}
