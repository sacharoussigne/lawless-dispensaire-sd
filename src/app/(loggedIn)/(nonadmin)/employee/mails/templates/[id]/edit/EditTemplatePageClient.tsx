'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { updateUserMailTemplate } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplate } from '@/types/mailTemplates';
import { TemplateFormHeader } from '../../../components/TemplateFormHeader';
import { TemplateEditorLayout } from '../../../components/TemplateEditorLayout';
import { routes } from '@/types/routes';

interface EditTemplatePageClientProps {
  template: MailTemplate;
}

export default function EditTemplatePageClient({
  template,
}: EditTemplatePageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    initialValues: {
      name: template.name,
      content: template.content,
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      content: (value) => (value.length < 1 ? 'Le contenu est requis' : null),
    },
  });

  const handleCopy = async () => {
    if (!form.values.content) return;

    try {
      await navigator.clipboard.writeText(form.values.content);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Template copié dans le presse-papiers',
        color: 'green',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le template',
        color: 'red',
      });
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      const result = await updateUserMailTemplate({
        id: template.id,
        name: values.name,
        content: values.content,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Template modifié avec succès',
        color: 'green',
      });
      router.push(routes.employee.mails);
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'red',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <TemplateFormHeader
          content={form.values.content}
          copied={copied}
          loading={loading}
          submitLabel="Modifier"
          formId="template-form"
          onCopy={handleCopy}
        />

        <Title order={1}>Modifier le modèle "{template.name}"</Title>

        <form id="template-form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Nom"
              placeholder="Nom du modèle"
              required
              {...form.getInputProps('name')}
            />

            <TemplateEditorLayout
              content={form.values.content}
              onContentChange={(value) => form.setFieldValue('content', value)}
            />
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
