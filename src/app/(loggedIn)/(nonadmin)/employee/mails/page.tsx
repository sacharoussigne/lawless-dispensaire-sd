import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import UserMailTemplatesPageClient from './UserMailTemplatesPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function UserMailTemplatesContent() {
  const mailTemplatesResult = await getUserMailTemplates();

  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des modèles de courriers');

  return (
    <UserMailTemplatesPageClient
      initialMailTemplates={mailTemplates}
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
