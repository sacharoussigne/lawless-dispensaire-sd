'use client';

import { useEffect } from 'react';
import { Stack, TextInput, MultiSelect, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CompanyWithRelations } from '@/types/companies';
import type { CompanyGroupSelect } from '@/types/items';
import { toCompanyGroupSelectOptions } from '@/lib/items/selectOptions';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type {
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
} from '../hooks/useCompaniesQueries';

interface CompanyModalProps {
  opened: boolean;
  onClose: () => void;
  editingCompany: CompanyWithRelations | null;
  companyGroups: CompanyGroupSelect[];
  createMutation: ReturnType<typeof useCreateCompanyMutation>;
  updateMutation: ReturnType<typeof useUpdateCompanyMutation>;
}

export function CompanyModal({
  opened,
  onClose,
  editingCompany,
  companyGroups,
  createMutation,
  updateMutation,
}: CompanyModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      companyGroupIds: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  useEffect(() => {
    if (editingCompany) {
      form.setValues({
        name: editingCompany.name,
        companyGroupIds: editingCompany.companyGroups.map(
          (g) => g.companyGroupId ?? g.companyGroup.id,
        ),
      });
    } else {
      form.reset();
    }
  }, [editingCompany, opened]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const formId = 'company-modal-form';

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        companyGroupIds:
          values.companyGroupIds.length > 0 ? values.companyGroupIds : undefined,
      };

      if (editingCompany) {
        await updateMutation.mutateAsync({
          id: editingCompany.id,
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

  const companyGroupOptions = toCompanyGroupSelectOptions(companyGroups);

  return (
    <AppModal
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
      }}
      title={editingCompany ? 'Modifier l\'entreprise' : 'Créer une entreprise'}
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
            {editingCompany ? 'Modifier' : 'Créer'}
          </Button>
        </AppModalFooter>
      }
    >
      <form id={formId} onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom"
            placeholder="Nom de l'entreprise"
            required
            {...form.getInputProps('name')}
          />
          <MultiSelect
            label="Groupes d'entreprises"
            placeholder={
              companyGroups.length === 0
                ? 'Aucun groupe disponible'
                : 'Sélectionner des groupes'
            }
            data={companyGroupOptions}
            value={form.values.companyGroupIds}
            onChange={(value) => form.setFieldValue('companyGroupIds', value)}
            error={form.errors.companyGroupIds}
            searchable
            clearable
          />
        </Stack>
      </form>
    </AppModal>
  );
}
