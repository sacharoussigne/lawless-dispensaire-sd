'use client';

import { authClient } from '@/lib/client';
import {
  Anchor,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Signup() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
      username: '',
    },

    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value.trim()) ? null : 'Format d\'email invalide',
      password: (value) =>
        !!value.trim()
          ? (value.trim().length > 7
            ? null
            : 'Le mot de passe doit contenir au moins 8 caractères')
          : 'Le mot de passe est requis',
      username: (value) => (!!value.trim() ? null : 'Le nom d\'utilisateur est requis'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setAuthError(undefined);
    setIsLoading(true);
    const response = await authClient.signUp.email({
      email: values.email.trim(),
      password: values.password.trim(),
      name: values.username.trim(),

      fetchOptions: {
        onSuccess: () => {
          setIsLoading(false);
          router.refresh();
        },
      },
    });

    setIsLoading(false);

    if (response.error) {
      setAuthError(response.error.message);
    } else {
      setAuthError(undefined);
    }

  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Bienvenue !</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Vous avez déjà un compte ?{' '}
        <Link href={'/auth/login'}>
          <Anchor size="sm" component="button">
            Se connecter
          </Anchor>
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Nom d'utilisateur"
            placeholder="nom d'utilisateur"
            required
            key={form.key('username')}
            {...form.getInputProps('username')}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="vous@exemple.com"
            required
            mt="md"
            key={form.key('email')}
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Mot de passe"
            placeholder="Votre mot de passe"
            required
            mt="md"
            key={form.key('password')}
            {...form.getInputProps('password')}
          />
          <Group justify="space-between" mt="lg">
            <Checkbox label="Se souvenir de moi" />
          </Group>
          {authError && (
            <Text c="danger" size="sm" mt="md">
              {authError}
            </Text>
          )}
          <Button
            fullWidth
            mt="xl"
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            S'inscrire
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
