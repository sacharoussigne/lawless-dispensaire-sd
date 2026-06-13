'use client';

import { useTenantRoutes, useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Stack,
  TextInput,
  Button,
  Group,
  Select,
  Grid,
} from '@mantine/core';
import { IconArrowLeft, IconCopy, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createMail } from '@/app/_actions/mails';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplateOption } from '@/types/mails';
import { TemplateEditor } from '../components/TemplateEditor';
import {
  TemplatePreviewWithForm,
  useTemplatePreviewActions,
} from '../components/TemplatePreviewPanel';
import { useUserMailTemplateDetail, useUserMailTemplateOptions } from '../hooks/useMailsQueries';

interface NewMailPageClientProps {
  initialTemplateOptions: MailTemplateOption[];
}

export default function NewMailPageClient({
  initialTemplateOptions,
}: NewMailPageClientProps) {
  const routes = useTenantRoutes();
  const dispensarySlug = useRequiredDispensarySlug();
  const router = useRouter();
  const { data: templateOptions = initialTemplateOptions } =
    useUserMailTemplateOptions(initialTemplateOptions);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: selectedTemplate } = useUserMailTemplateDetail(
    selectedTemplateId,
    Boolean(selectedTemplateId),
  );
  const preview = useTemplatePreviewActions(selectedTemplate?.content ?? '');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      receiver: '',
      content: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      receiver: (value) => (value.length < 1 ? 'Le destinataire est requis' : null),
      content: (value) => (value.length < 1 ? 'Le contenu est requis' : null),
    },
  });

  useEffect(() => {
    if (selectedTemplate && (preview.hasInputs || preview.resultContent)) {
      form.setFieldValue('content', preview.resultContent);
    } else if (!selectedTemplate) {
      form.setFieldValue('content', '');
    }
  }, [preview.resultContent, selectedTemplate, preview.hasInputs]);

  useEffect(() => {
    if (selectedTemplate) {
      form.setFieldValue('name', selectedTemplate.defaultMailName ?? '');
    }
  }, [selectedTemplate?.id]);

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    preview.resetTemplateForm();

    if (!templateId) {
      form.setFieldValue('content', '');
      form.setFieldValue('name', '');
    }
  };

  const handleResultChange = (value: string) => {
    preview.setEditedContent(value);
    form.setFieldValue('content', value);
  };

  const handleSubmit = async (values: typeof form.values) => {
    const content =
      preview.editedContent ??
      (preview.hasInputs ? preview.formContent : values.content);

    try {
      setLoading(true);
      const result = await createMail(dispensarySlug, {
        name: values.name,
        receiver: values.receiver,
        content,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Courrier créé avec succès',
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
        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push(routes.employee.mails)}
          >
            Retour
          </Button>
          <Group>
            {selectedTemplate && preview.hasInputs && (
              <Button
                variant="subtle"
                leftSection={<IconRefresh size={16} />}
                onClick={preview.resetTemplateForm}
              >
                Réinitialiser
              </Button>
            )}
            {(preview.resultContent || form.values.content) && (
              <Button
                leftSection={
                  preview.copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                }
                onClick={() =>
                  preview.handleCopy(preview.resultContent || form.values.content)
                }
                variant={preview.copied ? 'light' : 'default'}
                color={preview.copied ? 'moss' : undefined}
              >
                {preview.copied ? 'Copiée !' : 'Copier le courrier'}
              </Button>
            )}
            <Button type="submit" loading={loading} form="mail-form">
              Créer
            </Button>
          </Group>
        </Group>

        <Title order={1}>Créer un courrier</Title>

        <form id="mail-form" onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Grid gutter="md">
              <Grid.Col span={4}>
                <Select
                  label="Template (optionnel)"
                  placeholder="Sélectionner un template ou laisser vide pour créer manuellement"
                  data={templateOptions.map((t) => ({ value: t.id, label: t.name }))}
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Nom"
                  placeholder="Nom du courrier"
                  required
                  {...form.getInputProps('name')}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Destinataire"
                  placeholder="Nom du destinataire"
                  required
                  {...form.getInputProps('receiver')}
                />
              </Grid.Col>
            </Grid>

            {selectedTemplate && preview.hasInputs ? (
              <TemplatePreviewWithForm
                templateContent={selectedTemplate.content}
                formRef={preview.formRef}
                onFormChange={preview.setFormContent}
                resultContent={preview.resultContent}
                onResultChange={handleResultChange}
                isManuallyEdited={preview.isManuallyEdited}
                onRegenerate={preview.handleRegenerate}
              />
            ) : (
              <TemplateEditor
                label="Contenu"
                placeholder="Contenu du courrier"
                required
                minRows={15}
                value={
                  selectedTemplate && !preview.hasInputs
                    ? preview.resultContent
                    : form.values.content
                }
                onChange={(value) => {
                  if (selectedTemplate && !preview.hasInputs) {
                    preview.setEditedContent(value);
                  }
                  form.setFieldValue('content', value);
                }}
              />
            )}
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
