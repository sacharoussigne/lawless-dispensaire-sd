import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import NewMailPageClient from './NewMailPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function NewMailContent({ dispensarySlug }: { dispensarySlug: string }) {
  const mailTemplatesResult = await getUserMailTemplates(dispensarySlug);
  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des templates');

  return (
    <NewMailPageClient
      initialMailTemplates={mailTemplates}
    />
  );
}

export default async function NewMailPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <NewMailContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
