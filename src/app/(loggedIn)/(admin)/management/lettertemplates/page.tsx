import { getLetterTemplates } from '@/app/_actions/letterTemplates';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import LetterTemplatesPageClient from './LetterTemplatesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function LetterTemplatesContent() {
  const letterTemplatesResult = await getLetterTemplates();
  const assignmentsResult = await getOrderLetterTemplateAssignments();

  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const letterTemplates = getDataOrThrow(letterTemplatesResult, 'Erreur lors du chargement des templates de lettres');
  const assignments = getDataOrThrow(assignmentsResult, 'Erreur lors du chargement des assignations');

  return (
    <LetterTemplatesPageClient
      initialLetterTemplates={letterTemplates}
      initialAssignments={assignments}
    />
  );
}

export default function LetterTemplatesPage() {
  return (
    <SuspenseLoader>
      <LetterTemplatesContent />
    </SuspenseLoader>
  );
}
