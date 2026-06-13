'use client';

import { useTenantRoutes, useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Stack,
  TextInput,
  Button,
  Group,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { updateMail } from '@/app/_actions/mails';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { Mail } from '@prisma/client';
import { TemplateEditor } from '../../components/TemplateEditor';


interface EditMailPageClientProps {
  mail: Mail;
}

export default function EditMailPageClient({
  mail,
}: EditMailPageClientProps) {
  const routes = useTenantRoutes();
  const dispensarySlug = useRequiredDispensarySlug();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: mail.name,
      receiver: mail.receiver,
      content: mail.content,
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      receiver: (value) => (value.length < 1 ? 'Le destinataire est requis' : null),
      content: (value) => (value.length < 1 ? 'Le contenu est requis' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      const result = await updateMail(dispensarySlug, {
        id: mail.id,
        name: values.name,
        receiver: values.receiver,
        content: values.content,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Courrier modifié avec succès',
        color: 'moss',
      });
      router.push(routes.employee.mails);
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'danger',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push(routes.employee.mails)}
          >
            Retour
          </Button>
        </Group>

        <Title order={1}>Modifier le courrier</Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Nom"
              placeholder="Nom du courrier"
              required
              {...form.getInputProps('name')}
            />

            <TextInput
              label="Destinataire"
              placeholder="Nom du destinataire"
              required
              {...form.getInputProps('receiver')}
            />

            <TemplateEditor
              label="Contenu"
              placeholder="Contenu du courrier"
              required
              minRows={15}
              value={form.values.content}
              onChange={(value) => form.setFieldValue('content', value)}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => router.push(routes.employee.mails)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" loading={loading}>
                Modifier
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
