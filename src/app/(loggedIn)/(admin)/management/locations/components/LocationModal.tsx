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
import { createLocation, updateLocation } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { LocationWithCompanies } from '@/types/locations';

interface LocationModalProps {
  opened: boolean;
  onClose: () => void;
  editingLocation: LocationWithCompanies | null;
  onSuccess: () => void;
}

export function LocationModal({
  opened,
  onClose,
  editingLocation,
  onSuccess,
}: LocationModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  // Initialiser le formulaire quand le lieu change
  useEffect(() => {
    if (editingLocation) {
      form.setValues({
        name: editingLocation.name,
        description: editingLocation.description || '',
      });
    } else {
      form.reset();
    }
  }, [editingLocation, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingLocation) {
        result = await updateLocation({
          id: editingLocation.id,
          name: values.name,
          description: values.description || undefined,
        });
      } else {
        result = await createLocation({
          name: values.name,
          description: values.description || undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingLocation
          ? 'Lieu modifié avec succès'
          : 'Lieu créé avec succès',
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
      title={editingLocation ? 'Modifier le lieu' : 'Créer un lieu'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom du lieu"
            required
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Description du lieu (optionnel)"
            rows={4}
            {...form.getInputProps('description')}
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
              {editingLocation ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

