import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import TestTemplatePageClient from './TestTemplatePageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { redirect } from 'next/navigation';
import { tenantRoutes } from '@/types/routes';

async function TestTemplateContent({
  dispensarySlug,
  templateId,
}: {
  dispensarySlug: string;
  templateId: string;
}) {
  const mailTemplatesResult = await getUserMailTemplates(dispensarySlug);
  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des templates');

  const template = mailTemplates.find((t) => t.id === templateId);

  if (!template) {
    redirect(tenantRoutes(dispensarySlug).employee.mails);
  }

  return <TestTemplatePageClient template={template} />;
}

export default async function TestTemplatePage({
  params,
}: {
  params: Promise<{ dispensarySlug: string; id: string }>;
}) {
  const { dispensarySlug, id } = await params;

  return (
    <SuspenseLoader>
      <TestTemplateContent dispensarySlug={dispensarySlug} templateId={id} />
    </SuspenseLoader>
  );
}
