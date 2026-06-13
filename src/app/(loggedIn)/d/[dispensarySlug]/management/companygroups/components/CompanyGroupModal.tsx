'use client';

import { useEffect } from 'react';
import { Stack, TextInput, Textarea, MultiSelect, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CompanyGroupWithRelations } from '@/types/companyGroups';
import type { CompanySelect } from '@/types/companies';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type {
  useCreateCompanyGroupMutation,
  useUpdateCompanyGroupMutation,
} from '../hooks/useCompanyGroupsQueries';

interface CompanyGroupModalProps {
  opened: boolean;
  onClose: () => void;
  editingCompanyGroup: CompanyGroupWithRelations | null;
  companies: CompanySelect[];
  createMutation: ReturnType<typeof useCreateCompanyGroupMutation>;
  updateMutation: ReturnType<typeof useUpdateCompanyGroupMutation>;
}

export function CompanyGroupModal({
  opened,
  onClose,
  editingCompanyGroup,
  companies,
  createMutation,
  updateMutation,
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

  useEffect(() => {
    if (editingCompanyGroup) {
      form.setValues({
        name: editingCompanyGroup.name,
        description: editingCompanyGroup.description || '',
        companyIds: editingCompanyGroup.companies.map(
          (c) => c.companyId ?? c.company.id,
        ),
      });
    } else {
      form.reset();
    }
  }, [editingCompanyGroup, opened]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const formId = 'company-group-modal-form';

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        companyIds: values.companyIds.length > 0 ? values.companyIds : undefined,
      };

      if (editingCompanyGroup) {
        await updateMutation.mutateAsync({
          id: editingCompanyGroup.id,
          ...payload,
        });
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

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  return (
    <AppModal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingCompanyGroup ? 'Modifier le groupe d\'entreprises' : 'Créer un groupe d\'entreprises'}
      size="md"
      footer={
        <AppModalFooter>
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
          <Button type="submit" form={formId} loading={isPending}>
            {editingCompanyGroup ? 'Modifier' : 'Créer'}
          </Button>
        </AppModalFooter>
      }
    >
      <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
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
        </Stack>
      </form>
    </AppModal>
  );
}
