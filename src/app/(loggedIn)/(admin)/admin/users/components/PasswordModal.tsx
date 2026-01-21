'use client';

import { useEffect } from 'react';
import {
  Modal,
  Stack,
  PasswordInput,
  Button,
  Group,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { setPassword } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { User } from '@/types/users';

interface PasswordModalProps {
  opened: boolean;
  onClose: () => void;
  userForPassword: User | null;
  onSuccess: () => void;
}

export function PasswordModal({
  opened,
  onClose,
  userForPassword,
  onSuccess,
}: PasswordModalProps) {
  const passwordForm = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) =>
        value.length < 8
          ? 'Le mot de passe doit contenir au moins 8 caractères'
          : null,
      confirmPassword: (value, values) =>
        value !== values.password ? 'Les mots de passe ne correspondent pas' : null,
    },
  });

  useEffect(() => {
    if (!opened) {
      passwordForm.reset();
    }
  }, [opened]);

  const handlePasswordChange = async (values: typeof passwordForm.values) => {
    if (!userForPassword) return;

    try {
      const result = await setPassword({
        userId: userForPassword.id,
        password: values.password,
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Mot de passe modifié avec succès',
        color: 'green',
      });
      onSuccess();
      passwordForm.reset();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, passwordForm);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors du changement de mot de passe',
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
        passwordForm.reset();
      }}
      title="Changer le mot de passe"
    >
      <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Utilisateur : {userForPassword?.name} ({userForPassword?.email})
          </Text>
          <PasswordInput
            label="Nouveau mot de passe"
            placeholder="Mot de passe (min. 8 caractères)"
            required
            {...passwordForm.getInputProps('password')}
          />
          <PasswordInput
            label="Confirmer le mot de passe"
            placeholder="Confirmer le mot de passe"
            required
            {...passwordForm.getInputProps('confirmPassword')}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                onClose();
                passwordForm.reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit">Changer le mot de passe</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

