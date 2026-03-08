import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import TestTemplatePageClient from './TestTemplatePageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

async function TestTemplateContent({ templateId }: { templateId: string }) {
  const mailTemplatesResult = await getUserMailTemplates();
  const mailTemplates = getDataOrThrow(mailTemplatesResult, 'Erreur lors du chargement des templates');
  
  const template = mailTemplates.find((t) => t.id === templateId);
  
  if (!template) {
    redirect(routes.employee.mails);
  }

  return <TestTemplatePageClient template={template} />;
}

export default async function TestTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SuspenseLoader>
      <TestTemplateContent templateId={id} />
    </SuspenseLoader>
  );
}
