'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createMailTemplate, updateMailTemplate } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplate } from '@/types/mailTemplates';

interface MailTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  editingMailTemplate: MailTemplate | null;
  onSuccess: () => void;
}

export function MailTemplateModal({
  opened,
  onClose,
  editingMailTemplate,
  onSuccess,
}: MailTemplateModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      defaultMailName: '',
      content: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      content: (value) => (value.length < 1 ? 'Le contenu est requis' : null),
    },
  });

  useEffect(() => {
    if (editingMailTemplate) {
      form.setValues({
        name: editingMailTemplate.name,
        description: editingMailTemplate.description || '',
        defaultMailName: editingMailTemplate.defaultMailName || '',
        content: editingMailTemplate.content,
      });
    } else {
      form.reset();
    }
  }, [editingMailTemplate, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingMailTemplate) {
        result = await updateMailTemplate({
          id: editingMailTemplate.id,
          name: values.name,
          description: values.description || undefined,
          content: values.content,
          defaultMailName: values.defaultMailName || undefined,
        });
      } else {
        result = await createMailTemplate({
          name: values.name,
          description: values.description || undefined,
          content: values.content,
          defaultMailName: values.defaultMailName || undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingMailTemplate
          ? 'Template modifié avec succès'
          : 'Template créé avec succès',
        color: 'green',
      });
      onClose();
      form.reset();
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
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingMailTemplate ? 'Modifier le modèle' : 'Créer un modèle'}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom du template"
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Nom du courrier par défaut"
            placeholder="Préremplit le champ « Nom » à la création d’un courrier (optionnel)"
            {...form.getInputProps('defaultMailName')}
          />
          <Textarea
            label="Description"
            placeholder="Description du template (optionnel)"
            minRows={3}
            autosize
            {...form.getInputProps('description')}
          />
          <Textarea
            label="Contenu"
            placeholder="Contenu du modèle de courrier"
            required
            minRows={10}
            autosize
            {...form.getInputProps('content')}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onClose();
                form.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit">
              {editingMailTemplate ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
