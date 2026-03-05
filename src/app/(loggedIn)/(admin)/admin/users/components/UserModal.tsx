'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Group,
  MultiSelect,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createUser, updateUser } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { Role, rolesAsString } from '@/types/enum/roles';
import type { User } from '@/types/users';

interface UserModalProps {
  opened: boolean;
  onClose: () => void;
  editingUser: User | null;
  onSuccess: () => void;
}

const roleOptions = [
  { value: 'user', label: rolesAsString(Role.USER) },
  { value: 'admin', label: rolesAsString(Role.ADMIN) },
  { value: 'employee', label: rolesAsString(Role.EMPLOYEE) },
  { value: 'inventory_manager', label: rolesAsString(Role.INVENTORY_MANAGER) },
];

export function UserModal({
  opened,
  onClose,
  editingUser,
  onSuccess,
}: UserModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      roles: [Role.USER] as Role[],
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      email: (value) => {
        if (!editingUser && !value) return 'L\'email est requis';
        if (!editingUser && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return 'Email invalide';
        return null;
      },
      password: (value) => {
        if (!editingUser && !value) return 'Le mot de passe est requis';
        if (value && value.length < 8)
          return 'Le mot de passe doit contenir au moins 8 caractères';
        return null;
      },
    },
  });

  // Initialiser le formulaire quand l'utilisateur change
  useEffect(() => {
    if (editingUser) {
      form.setValues({
        name: editingUser.name,
        email: editingUser.email,
        password: '',
        roles: (
          (editingUser.role ?? 'user')
            .split(',')
            .map((r) => r.trim())
            .filter((r) =>
              [Role.USER, Role.ADMIN, Role.EMPLOYEE, Role.INVENTORY_MANAGER].includes(r as Role)
            ) as Role[]
        ).length > 0
          ? (editingUser.role ?? 'user')
              .split(',')
              .map((r) => r.trim())
              .filter((r) =>
                [Role.USER, Role.ADMIN, Role.EMPLOYEE, Role.INVENTORY_MANAGER].includes(r as Role)
              ) as Role[]
          : [Role.USER],
      });
    } else {
      form.reset();
      form.setFieldValue('roles', [Role.USER]);
    }
  }, [editingUser, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingUser) {
        const result = await updateUser({
          id: editingUser.id,
          name: values.name,
          roles: values.roles,
        });
        handleAction(result);
        notifications.show({
          title: 'Succès',
          message: 'Utilisateur modifié avec succès',
          color: 'green',
        });
      } else {
        const result = await createUser({
          name: values.name,
          email: values.email,
          password: values.password,
          roles: values.roles,
        });
        handleAction(result);
        notifications.show({
          title: 'Succès',
          message: 'Utilisateur créé avec succès',
          color: 'green',
        });
      }
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
      title={editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nom"
            placeholder="Nom de l'utilisateur"
            required
            {...form.getInputProps('name')}
          />
          {!editingUser ? (
            <TextInput
              label="Email"
              placeholder="email@example.com"
              required
              {...form.getInputProps('email')}
            />
          ) : (
            <TextInput
              label="Email"
              value={editingUser.email}
              disabled
              readOnly
            />
          )}
          {!editingUser && (
            <PasswordInput
              label="Mot de passe"
              placeholder="Mot de passe (min. 8 caractères)"
              required
              {...form.getInputProps('password')}
            />
          )}
          <MultiSelect
            label="Rôles"
            data={roleOptions}
            required
            searchable
            clearable={false}
            {...form.getInputProps('roles')}
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
              {editingUser ? 'Enregistrer' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

