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
import { createLetterTemplate, updateLetterTemplate } from '@/app/_actions/letterTemplates';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { LetterTemplate } from '@/types/letterTemplates';

interface LetterTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  editingLetterTemplate: LetterTemplate | null;
  onSuccess: () => void;
}

export function LetterTemplateModal({
  opened,
  onClose,
  editingLetterTemplate,
  onSuccess,
}: LetterTemplateModalProps) {
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

  // Initialiser le formulaire quand le template change
  useEffect(() => {
    if (editingLetterTemplate) {
      form.setValues({
        name: editingLetterTemplate.name,
        content: editingLetterTemplate.content,
      });
    } else {
      form.reset();
    }
  }, [editingLetterTemplate, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingLetterTemplate) {
        result = await updateLetterTemplate({
          id: editingLetterTemplate.id,
          name: values.name,
          content: values.content,
        });
      } else {
        result = await createLetterTemplate({
          name: values.name,
          content: values.content,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingLetterTemplate
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
      title={editingLetterTemplate ? 'Modifier le template' : 'Créer un template'}
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
          <Textarea
            label="Contenu"
            placeholder="Contenu de la lettre"
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
              {editingLetterTemplate ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
