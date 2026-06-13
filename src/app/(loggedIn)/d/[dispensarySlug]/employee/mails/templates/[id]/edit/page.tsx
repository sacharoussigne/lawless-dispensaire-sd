import { getUserMailTemplateById } from '@/app/_actions/mailTemplates';
import EditTemplatePageClient from './EditTemplatePageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

async function EditTemplateContent({
  dispensarySlug,
  templateId,
}: {
  dispensarySlug: string;
  templateId: string;
}) {
  const templateResult = await getUserMailTemplateById(dispensarySlug, {
    id: templateId,
  });

  if (templateResult.status === 404) {
    redirect(tenantRoutes(dispensarySlug).employee.mails);
  }

  const template = getDataOrThrow(
    templateResult,
    'Erreur lors du chargement du template',
  );

  return <EditTemplatePageClient template={template} />;
}

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ dispensarySlug: string; id: string }>;
}) {
  const { dispensarySlug, id } = await params;

  return (
    <SuspenseLoader>
      <EditTemplateContent dispensarySlug={dispensarySlug} templateId={id} />
    </SuspenseLoader>
  );
}
