'use client';

import type { MailTemplate } from '@/types/mails';
import { UserTemplateFormPage } from '../../../components/UserTemplateFormPage';

interface EditTemplatePageClientProps {
  template: MailTemplate;
}

export default function EditTemplatePageClient({
  template,
}: EditTemplatePageClientProps) {
  return <UserTemplateFormPage mode="edit" template={template} />;
}
