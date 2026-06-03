'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createUserMailTemplate, updateUserMailTemplate } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplate } from '@/types/mailTemplates';
import { TemplateEditor } from './TemplateEditor';

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
  const { dispensarySlug } = usePermissions();
  const form = useForm({
    initialValues: {
      name: '',
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
        result = await updateUserMailTemplate(dispensarySlug!, {
          id: editingMailTemplate.id,
          name: values.name,
          content: values.content,
        });
      } else {
        result = await createUserMailTemplate(dispensarySlug!, {
          name: values.name,
          content: values.content,
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
      size="70%"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom du template"
            required
            {...form.getInputProps('name')}
          />
          <TemplateEditor
            label="Contenu"
            placeholder="Contenu du modèle de courrier"
            required
            minRows={10}
            value={form.values.content}
            onChange={(value) => form.setFieldValue('content', value)}
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
