'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Stack, TextInput, Grid } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createUserMailTemplate } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { TemplateFormHeader } from '../../components/TemplateFormHeader';
import { TemplateEditorLayout } from '../../components/TemplateEditorLayout';
import { routes } from '@/types/routes';

export default function NewTemplatePageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      content: '',
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
      const result = await createUserMailTemplate({
        name: values.name,
        description: values.description || undefined,
        content: values.content,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Template créé avec succès',
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
          submitLabel="Créer"
          formId="template-form"
          onCopy={handleCopy}
        />

        <Title order={1}>Créer un modèle</Title>

        <form id="template-form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Grid gutter="xl">
              <Grid.Col span={6}>
                <TextInput
                  label="Nom"
                  placeholder="Nom du modèle"
                  required
                  {...form.getInputProps('name')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Description"
                  placeholder="Description du modèle (optionnel)"
                  {...form.getInputProps('description')}
                />
              </Grid.Col>
            </Grid>

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
