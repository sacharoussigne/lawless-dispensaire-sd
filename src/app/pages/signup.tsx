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
        /^\S+@\S+$/.test(value.trim()) ? null : 'Invalid email format',
      password: (value) =>
        !!value.trim()
          ? (value.trim().length > 7
            ? null
            : 'Password must be at least 8 characters long')
          : 'Password is required',
      username: (value) => (!!value.trim() ? null : 'Username is required'),
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
      <Title ta="center">Welcome to Lingzy !</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account ?{' '}
        <Link href={'/auth/login'}>
          <Anchor size="sm" component="button">
            Login
          </Anchor>
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Username"
            placeholder="username"
            required
            key={form.key('username')}
            {...form.getInputProps('username')}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            mt="md"
            key={form.key('email')}
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            key={form.key('password')}
            {...form.getInputProps('password')}
          />
          <Group justify="space-between" mt="lg">
            <Checkbox label="Remember me" />
            <Anchor component="button" size="sm">
              Forgot password?
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
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            Sign up
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
