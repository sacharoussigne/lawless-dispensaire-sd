'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Stack, TextInput, Grid } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  createUserMailTemplate,
  updateUserMailTemplate,
} from '@/app/_actions/mailTemplates';
import { usePermissions, useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplate } from '@/types/mails';
import { TemplateFormHeader } from './TemplateFormHeader';
import { TemplateEditorLayout } from './TemplateEditorLayout';

interface UserTemplateFormPageProps {
  mode: 'create' | 'edit';
  template?: MailTemplate;
}

export function UserTemplateFormPage({ mode, template }: UserTemplateFormPageProps) {
  const routes = useTenantRoutes();
  const { dispensarySlug } = usePermissions();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    initialValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      defaultMailName: template?.defaultMailName ?? '',
      content: template?.content ?? '',
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
        color: 'moss',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le template',
        color: 'danger',
      });
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      const payload = {
        name: values.name,
        description: values.description || undefined,
        content: values.content,
        defaultMailName: values.defaultMailName || undefined,
      };

      const result =
        mode === 'create'
          ? await createUserMailTemplate(dispensarySlug!, payload)
          : await updateUserMailTemplate(dispensarySlug!, {
              id: template!.id,
              ...payload,
            });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message:
          mode === 'create'
            ? 'Template créé avec succès'
            : 'Template modifié avec succès',
        color: 'moss',
      });
      router.push(routes.employee.mails);
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message:
            error instanceof Error
              ? error.message
              : 'Erreur lors de la sauvegarde',
          color: 'danger',
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
          submitLabel={mode === 'create' ? 'Créer' : 'Modifier'}
          formId="template-form"
          onCopy={handleCopy}
        />

        <Title order={1}>
          {mode === 'create'
            ? 'Créer un modèle'
            : `Modifier le modèle "${template!.name}"`}
        </Title>

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
              <Grid.Col span={12}>
                <TextInput
                  label="Nom du courrier par défaut"
                  placeholder="Préremplit le champ « Nom » à la création d’un courrier (optionnel)"
                  {...form.getInputProps('defaultMailName')}
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
