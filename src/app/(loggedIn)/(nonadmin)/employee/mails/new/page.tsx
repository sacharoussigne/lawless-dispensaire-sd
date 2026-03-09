import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import NewMailPageClient from './NewMailPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function NewMailContent() {
  const mailTemplatesResult = await getUserMailTemplates();
  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des templates');

  return (
    <NewMailPageClient
      initialMailTemplates={mailTemplates}
    />
  );
}

export default function NewMailPage() {
  return (
    <SuspenseLoader>
      <NewMailContent />
    </SuspenseLoader>
  );
}
