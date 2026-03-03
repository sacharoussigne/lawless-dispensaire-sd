'use client';

import {
  Anchor,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { useForm } from '@mantine/form';
import { DiscordButton } from '@/app/components/SocialButtons/DiscordButton';
import { authClient, signInWithDiscord } from '@/lib/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
    },

    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value.trim()) ? null : 'Email invalide',
      password: (value) => (!!value.trim() ? null : 'Le mot de passe est requis'),
    },
  });

  const handleSubmit = async (values: { email: string; password: string }) => {
    setAuthError(undefined);
    setIsLoading(true);
    const response = await authClient.signIn.email({
      email: values.email.trim(),
      password: values.password.trim(),
      fetchOptions: {
        onSuccess: () => {
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
      <Title ta="center">Bon retour ! </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Vous n'avez pas encore de compte ?{' '}
        <Link href={'/auth/signup'}>
          <Anchor size="sm" component="button">
            Créer un compte
          </Anchor>
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Group grow mb="md" mt="md">
          <DiscordButton radius="xl" onClick={signInWithDiscord}>
            Discord
          </DiscordButton>
        </Group>
        <Divider
          label="Ou continuer avec l'email"
          labelPosition="center"
          my="lg"
        />
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            type="email"
            placeholder="vous@exemple.com"
            required
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
            <Anchor component="button" size="sm">
              Mot de passe oublié ?
            </Anchor>
          </Group>
          {authError && (
            <Text color="red" size="sm" mt="md">
              {authError}
            </Text>
          )}
          <Button
            fullWidth
            mt="xl"
            type={'submit'}
            loading={isLoading}
            disabled={isLoading}
          >
            Se connecter
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
