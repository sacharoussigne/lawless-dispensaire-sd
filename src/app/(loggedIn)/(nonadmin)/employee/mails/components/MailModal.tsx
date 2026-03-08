'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Modal,
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
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createMail, updateMail } from '@/app/_actions/mails';
import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { Mail } from '@prisma/client';
import type { MailTemplate } from '@/types/mailTemplates';
import { TemplateEditor } from './TemplateEditor';
import { TemplateFormGenerator } from './TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';

interface MailModalProps {
  opened: boolean;
  onClose: () => void;
  editingMail: Mail | null;
  onSuccess: () => void;
}

export function MailModal({
  opened,
  onClose,
  editingMail,
  onSuccess,
}: MailModalProps) {
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');
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

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return mailTemplates.find((t) => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, mailTemplates]);

  const hasInputs = useMemo(() => {
    if (!selectedTemplate) return false;
    return extractInputs(selectedTemplate.content).length > 0;
  }, [selectedTemplate?.content]);

  useEffect(() => {
    if (opened && !editingMail) {
      loadMailTemplates();
    }
  }, [opened, editingMail]);

  useEffect(() => {
    if (editingMail) {
      form.setValues({
        name: editingMail.name,
        receiver: editingMail.receiver,
        content: editingMail.content,
      });
      setSelectedTemplateId(null);
      setRenderedContent('');
    } else {
      form.reset();
      setSelectedTemplateId(null);
      setRenderedContent('');
    }
  }, [editingMail, opened]);

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

  const loadMailTemplates = async () => {
    try {
      const result = await getUserMailTemplates();
      const data = handleAction(result);
      if (data) {
        setMailTemplates(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des templates',
        color: 'red',
      });
    }
  };

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      form.setFieldValue('content', '');
      setRenderedContent('');
    }
  };

  const handleTemplateContentChange = (content: string) => {
    setRenderedContent(content);
    form.setFieldValue('content', content);
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      let result;
      if (editingMail) {
        result = await updateMail({
          id: editingMail.id,
          name: values.name,
          receiver: values.receiver,
          content: values.content,
        });
      } else {
        result = await createMail({
          name: values.name,
          receiver: values.receiver,
          content: values.content,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingMail
          ? 'Courrier modifié avec succès'
          : 'Courrier créé avec succès',
        color: 'green',
      });
      onClose();
      form.reset();
      setSelectedTemplateId(null);
      setRenderedContent('');
      onSuccess();
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
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
        setSelectedTemplateId(null);
        setRenderedContent('');
      }}
      title={editingMail ? 'Modifier le courrier' : 'Créer un courrier'}
      size="80%"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {!editingMail && (
            <Select
              label="Template (optionnel)"
              placeholder="Sélectionner un template ou laisser vide pour créer manuellement"
              data={mailTemplates.map((t) => ({ value: t.id, label: t.name }))}
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              clearable
            />
          )}

          <TextInput
            label="Nom"
            placeholder="Nom du courrier"
            required
            {...form.getInputProps('name')}
          />

          <TextInput
            label="Destinataire"
            placeholder="Nom du destinataire"
            required
            {...form.getInputProps('receiver')}
          />

          {selectedTemplate && hasInputs && !editingMail ? (
            <Grid gutter="md">
              <Grid.Col span={4}>
                <Stack gap="md">
                  <Text size="sm" fw={600}>
                    Formulaire
                  </Text>
                  <ScrollArea style={{ maxHeight: '400px' }}>
                    <TemplateFormGenerator
                      template={selectedTemplate.content}
                      onChange={handleTemplateContentChange}
                      onCancel={() => {}}
                    />
                  </ScrollArea>
                </Stack>
              </Grid.Col>
              <Grid.Col span={8}>
                <Stack gap="md">
                  <Text size="sm" fw={600}>
                    Aperçu
                  </Text>
                  <Paper p="md" withBorder style={{ minHeight: '200px' }}>
                    <ScrollArea h={300}>
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
              minRows={10}
              value={form.values.content}
              onChange={(value) => form.setFieldValue('content', value)}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onClose();
                form.reset();
                setSelectedTemplateId(null);
                setRenderedContent('');
              }}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {editingMail ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
