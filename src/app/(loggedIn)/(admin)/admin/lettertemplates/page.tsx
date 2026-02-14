import { getLetterTemplates } from '@/app/_actions/letterTemplates';
import LetterTemplatesPageClient from './LetterTemplatesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function LetterTemplatesContent() {
  const letterTemplatesResult = await getLetterTemplates();

  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const letterTemplates = getDataOrThrow(letterTemplatesResult, 'Erreur lors du chargement des templates de lettres');

  return (
    <LetterTemplatesPageClient
      initialLetterTemplates={letterTemplates}
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
