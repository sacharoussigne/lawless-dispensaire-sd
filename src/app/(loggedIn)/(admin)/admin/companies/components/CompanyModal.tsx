'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Select,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createCompany, updateCompany } from '@/app/_actions/companies';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CompanyWithRelations, Location } from '@/types/companies';

interface CompanyModalProps {
  opened: boolean;
  onClose: () => void;
  editingCompany: CompanyWithRelations | null;
  locations: Location[];
  onSuccess: () => void;
}

export function CompanyModal({
  opened,
  onClose,
  editingCompany,
  locations,
  onSuccess,
}: CompanyModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      locationId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      locationId: (value) => (!value ? 'Le lieu est requis' : null),
    },
  });

  // Initialiser le formulaire quand l'entreprise change
  useEffect(() => {
    if (editingCompany) {
      form.setValues({
        name: editingCompany.name,
        locationId: editingCompany.locationId,
      });
    } else {
      form.reset();
    }
  }, [editingCompany, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingCompany) {
        result = await updateCompany({
          id: editingCompany.id,
          name: values.name,
          locationId: values.locationId,
        });
      } else {
        result = await createCompany({
          name: values.name,
          locationId: values.locationId,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCompany
          ? 'Entreprise modifiée avec succès'
          : 'Entreprise créée avec succès',
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

  const locationOptions = [...locations]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((location) => ({
      value: location.id,
      label: location.name,
    }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingCompany ? 'Modifier l\'entreprise' : 'Créer une entreprise'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom de l'entreprise"
            required
            {...form.getInputProps('name')}
          />
          <Select
            label="Lieu"
            placeholder="Sélectionner un lieu"
            data={locationOptions}
            required
            {...form.getInputProps('locationId')}
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
              {editingCompany ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

