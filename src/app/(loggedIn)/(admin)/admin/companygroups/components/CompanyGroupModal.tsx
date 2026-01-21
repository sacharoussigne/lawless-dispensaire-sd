'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  MultiSelect,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createCompanyGroup, updateCompanyGroup } from '@/app/_actions/companyGroups';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CompanyGroupWithRelations, CompanyWithRelations } from '@/types/companyGroups';

interface CompanyGroupModalProps {
  opened: boolean;
  onClose: () => void;
  editingCompanyGroup: CompanyGroupWithRelations | null;
  companies: CompanyWithRelations[];
  onSuccess: () => void;
}

export function CompanyGroupModal({
  opened,
  onClose,
  editingCompanyGroup,
  companies,
  onSuccess,
}: CompanyGroupModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      companyIds: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  // Initialiser le formulaire quand le groupe change
  useEffect(() => {
    if (editingCompanyGroup) {
      form.setValues({
        name: editingCompanyGroup.name,
        description: editingCompanyGroup.description || '',
        companyIds: editingCompanyGroup.companies.map((c) => c.companyId || c.id),
      });
    } else {
      form.reset();
    }
  }, [editingCompanyGroup, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingCompanyGroup) {
        result = await updateCompanyGroup({
          id: editingCompanyGroup.id,
          name: values.name,
          description: values.description || undefined,
          companyIds: values.companyIds.length > 0 ? values.companyIds : undefined,
        });
      } else {
        result = await createCompanyGroup({
          name: values.name,
          description: values.description || undefined,
          companyIds: values.companyIds.length > 0 ? values.companyIds : undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCompanyGroup
          ? 'Groupe d\'entreprises modifié avec succès'
          : 'Groupe d\'entreprises créé avec succès',
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

  const companyOptions = [...companies]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((company) => ({
      value: company.id,
      label: `${company.name} - ${company.location.name}`,
    }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingCompanyGroup ? 'Modifier le groupe d\'entreprises' : 'Créer un groupe d\'entreprises'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom du groupe d'entreprises"
            required
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Description du groupe d'entreprises (optionnel)"
            rows={4}
            {...form.getInputProps('description')}
          />
          <MultiSelect
            label="Entreprises"
            placeholder={
              companies.length === 0
                ? 'Aucune entreprise disponible'
                : 'Sélectionner des entreprises'
            }
            data={companyOptions}
            value={form.values.companyIds}
            onChange={(value) => form.setFieldValue('companyIds', value)}
            error={form.errors.companyIds}
            searchable
            clearable
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
              {editingCompanyGroup ? 'Modifier' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

