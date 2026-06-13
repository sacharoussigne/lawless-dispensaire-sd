import { getUserMailTemplateOptions } from '@/app/_actions/mailTemplates';
import NewMailPageClient from './NewMailPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function NewMailContent({ dispensarySlug }: { dispensarySlug: string }) {
  const optionsResult = await getUserMailTemplateOptions(dispensarySlug);
  const templateOptions = getDataOrThrow(
    optionsResult,
    'Erreur lors du chargement des templates',
  );

  return <NewMailPageClient initialTemplateOptions={templateOptions} />;
}

export default async function NewMailPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <NewMailContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}
