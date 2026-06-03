'use client';

import { usePermissions, useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Stack,
  TextInput,
  Button,
  Group,
  Select,
  Paper,
  Text,
  Textarea,
  ScrollArea,
  Grid,
} from '@mantine/core';
import { IconArrowLeft, IconCopy, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createMail } from '@/app/_actions/mails';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplate } from '@/types/mailTemplates';
import { TemplateEditor } from '../components/TemplateEditor';
import {
  TemplateFormGenerator,
  type TemplateFormGeneratorHandle,
} from '../components/TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';

interface NewMailPageClientProps {
  initialMailTemplates: MailTemplate[];
}

export default function NewMailPageClient({
  initialMailTemplates,
}: NewMailPageClientProps) {
  const routes = useTenantRoutes();
  const { dispensarySlug } = usePermissions();
  const router = useRouter();
  const formRef = useRef<TemplateFormGeneratorHandle>(null);
  const [mailTemplates] = useState<MailTemplate[]>(initialMailTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formContent, setFormContent] = useState('');
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return mailTemplates.find((t) => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, mailTemplates]);

  const hasInputs = useMemo(() => {
    if (!selectedTemplate) return false;
    return extractInputs(selectedTemplate.content).length > 0;
  }, [selectedTemplate?.content]);

  const staticContent = useMemo(() => {
    if (!selectedTemplate || hasInputs) return '';
    const context: RenderContext = { inputs: {} };
    return renderTemplate(selectedTemplate.content, context);
  }, [selectedTemplate?.content, hasInputs]);

  const autoContent = hasInputs ? formContent : staticContent;
  const resultContent = editedContent ?? autoContent;
  const isManuallyEdited = editedContent !== null;

  useEffect(() => {
    if (selectedTemplate && (hasInputs || staticContent)) {
      form.setFieldValue('content', resultContent);
    } else if (!selectedTemplate) {
      form.setFieldValue('content', '');
    }
  }, [resultContent, selectedTemplate, hasInputs, staticContent]);

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    setFormContent('');
    setEditedContent(null);
    formRef.current?.reset();

    if (templateId) {
      const t = mailTemplates.find((tpl) => tpl.id === templateId);
      form.setFieldValue('name', t?.defaultMailName ?? '');
    } else {
      form.setFieldValue('content', '');
    }
  };

  const handleFormChange = (content: string) => {
    setFormContent(content);
  };

  const handleResultChange = (value: string) => {
    setEditedContent(value);
    form.setFieldValue('content', value);
  };

  const handleRegenerate = () => {
    setEditedContent(null);
  };

  const handleResetTemplateForm = () => {
    formRef.current?.reset();
    setEditedContent(null);
  };

  const handleCopy = async () => {
    const contentToCopy = resultContent || form.values.content;
    if (!contentToCopy) return;

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Courrier copié dans le presse-papiers',
        color: 'green',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'red',
      });
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    const content = editedContent ?? (hasInputs ? formContent : values.content);

    try {
      setLoading(true);
      const result = await createMail(dispensarySlug!, {
        name: values.name,
        receiver: values.receiver,
        content,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Courrier créé avec succès',
        color: 'green',
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
        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push(routes.employee.mails)}
          >
            Retour
          </Button>
          <Group>
            {selectedTemplate && hasInputs && (
              <Button
                variant="subtle"
                leftSection={<IconRefresh size={16} />}
                onClick={handleResetTemplateForm}
              >
                Réinitialiser
              </Button>
            )}
            {(resultContent || form.values.content) && (
              <Button
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                onClick={handleCopy}
                variant={copied ? 'light' : 'default'}
                color={copied ? 'green' : undefined}
              >
                {copied ? 'Copiée !' : 'Copier le courrier'}
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
                  data={mailTemplates.map((t) => ({ value: t.id, label: t.name }))}
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

            {selectedTemplate && hasInputs ? (
              <Grid gutter="xl">
                <Grid.Col span={5}>
                  <Stack gap="md">
                    <Text size="sm" fw={600}>
                      Formulaire
                    </Text>
                    <Paper p="md" withBorder>
                      <ScrollArea h={600} scrollbars="y" type="auto">
                        <TemplateFormGenerator
                          ref={formRef}
                          template={selectedTemplate.content}
                          onChange={handleFormChange}
                        />
                      </ScrollArea>
                    </Paper>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={7}>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        Aperçu
                      </Text>
                      {isManuallyEdited && (
                        <Button variant="subtle" size="xs" onClick={handleRegenerate}>
                          Réappliquer le formulaire
                        </Button>
                      )}
                    </Group>
                    <Paper p="md" withBorder>
                      <Textarea
                        value={resultContent}
                        onChange={(e) => handleResultChange(e.currentTarget.value)}
                        placeholder="Remplissez le formulaire pour générer le résultat…"
                        minRows={24}
                        autosize
                        styles={{
                          input: {
                            fontFamily: 'inherit',
                            lineHeight: 1.5,
                          },
                        }}
                      />
                    </Paper>
                  </Stack>
                </Grid.Col>
              </Grid>
            ) : (
              <TemplateEditor
                label="Contenu"
                placeholder="Contenu du courrier"
                required
                minRows={15}
                value={
                  selectedTemplate && !hasInputs
                    ? resultContent
                    : form.values.content
                }
                onChange={(value) => {
                  if (selectedTemplate && !hasInputs) {
                    setEditedContent(value);
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
