'use client';

import { useEffect, useState, useMemo } from 'react';
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
  ScrollArea,
  Grid,
} from '@mantine/core';
import { IconArrowLeft, IconCopy, IconCheck } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createMail } from '@/app/_actions/mails';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplate } from '@/types/mailTemplates';
import { TemplateEditor } from '../components/TemplateEditor';
import { TemplateFormGenerator } from '../components/TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';
import { routes } from '@/types/routes';

interface NewMailPageClientProps {
  initialMailTemplates: MailTemplate[];
}

export default function NewMailPageClient({
  initialMailTemplates,
}: NewMailPageClientProps) {
  const router = useRouter();
  const [mailTemplates] = useState<MailTemplate[]>(initialMailTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');
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

  useEffect(() => {
    if (selectedTemplate && !hasInputs) {
      const context: RenderContext = { inputs: {} };
      const rendered = renderTemplate(selectedTemplate.content, context);
      setRenderedContent(rendered);
      form.setFieldValue('content', rendered);
    } else if (selectedTemplate && hasInputs) {
      form.setFieldValue('content', '');
      setRenderedContent('');
    } else if (!selectedTemplate) {
      setRenderedContent('');
    }
  }, [selectedTemplate, hasInputs]);

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const t = mailTemplates.find((tpl) => tpl.id === templateId);
      form.setFieldValue('name', t?.defaultMailName ?? '');
    } else {
      form.setFieldValue('content', '');
      setRenderedContent('');
    }
  };

  const handleTemplateContentChange = (content: string) => {
    setRenderedContent(content);
    form.setFieldValue('content', content);
  };

  const handleCopy = async () => {
    const contentToCopy = renderedContent || form.values.content;
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
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'red',
      });
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      const result = await createMail({
        name: values.name,
        receiver: values.receiver,
        content: values.content,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Courrier créé avec succès',
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
        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push(routes.employee.mails)}
          >
            Retour
          </Button>
          <Group>
            {(renderedContent || form.values.content) && (
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
                      <ScrollArea h={600}>
                        <TemplateFormGenerator
                          template={selectedTemplate.content}
                          onChange={handleTemplateContentChange}
                          onCancel={() => {}}
                        />
                      </ScrollArea>
                    </Paper>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={7}>
                  <Stack gap="md">
                    <Text size="sm" fw={600}>
                      Aperçu
                    </Text>
                    <Paper p="md" withBorder>
                      <ScrollArea h={600}>
                        <Text style={{ whiteSpace: 'pre-wrap' }}>
                          {renderedContent || 'Remplissez le formulaire pour voir l\'aperçu...'}
                        </Text>
                      </ScrollArea>
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
                value={form.values.content}
                onChange={(value) => form.setFieldValue('content', value)}
              />
            )}
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
