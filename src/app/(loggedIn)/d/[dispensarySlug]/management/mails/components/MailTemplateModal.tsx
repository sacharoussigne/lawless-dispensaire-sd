'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Loader,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { MailTemplateListItem } from '@/types/mailTemplates';
import {
  type useCreateMailTemplateMutation,
  useManagementMailTemplateDetail,
  type useUpdateMailTemplateMutation,
} from '../hooks/useMailTemplatesQueries';

interface MailTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  editingMailTemplate: MailTemplateListItem | null;
  createMutation: ReturnType<typeof useCreateMailTemplateMutation>;
  updateMutation: ReturnType<typeof useUpdateMailTemplateMutation>;
}

export function MailTemplateModal({
  opened,
  onClose,
  editingMailTemplate,
  createMutation,
  updateMutation,
}: MailTemplateModalProps) {
  const { data: editingDetail, isFetching: isLoadingDetail } =
    useManagementMailTemplateDetail(editingMailTemplate?.id ?? null, opened && Boolean(editingMailTemplate));

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
    if (!opened) return;

    if (editingMailTemplate && editingDetail) {
      form.setValues({
        name: editingDetail.name,
        description: editingDetail.description || '',
        defaultMailName: editingDetail.defaultMailName || '',
        content: editingDetail.content,
      });
    } else if (!editingMailTemplate) {
      form.reset();
    }
  }, [editingMailTemplate, editingDetail, opened]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditLoading = Boolean(editingMailTemplate) && isLoadingDetail && !editingDetail;

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        content: values.content,
        defaultMailName: values.defaultMailName || undefined,
      };

      if (editingMailTemplate) {
        await updateMutation.mutateAsync({ id: editingMailTemplate.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
      form.reset();
    } catch (error: unknown) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
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
      {isEditLoading ? (
        <Center py="xl">
          <Loader color="sage" />
        </Center>
      ) : (
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
                color="slate"
                onClick={() => {
                  onClose();
                  form.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" loading={isPending}>
                {editingMailTemplate ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
