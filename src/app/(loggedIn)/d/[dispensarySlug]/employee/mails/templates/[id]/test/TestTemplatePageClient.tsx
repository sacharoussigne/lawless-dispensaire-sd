'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Stack,
  Paper,
  Text,
  Textarea,
  Button,
  Group,
} from '@mantine/core';
import { IconCopy, IconCheck, IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import type { MailTemplate } from '@/types/mails';
import {
  TemplatePreviewWithForm,
  useTemplatePreviewActions,
} from '../../../components/TemplatePreviewPanel';

interface TestTemplatePageClientProps {
  template: MailTemplate;
}

export default function TestTemplatePageClient({
  template,
}: TestTemplatePageClientProps) {
  const routes = useTenantRoutes();
  const router = useRouter();
  const preview = useTemplatePreviewActions(template.content);

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push(routes.employee.mails)}
          >
            Retour
          </Button>
          <Group>
            {preview.hasInputs && (
              <Button
                variant="subtle"
                leftSection={<IconRefresh size={16} />}
                onClick={preview.resetTemplateForm}
              >
                Réinitialiser
              </Button>
            )}
            {preview.resultContent && (
              <Button
                leftSection={
                  preview.copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                }
                onClick={() => preview.handleCopy()}
                variant={preview.copied ? 'light' : 'default'}
                color={preview.copied ? 'moss' : undefined}
              >
                {preview.copied ? 'Copiée !' : 'Copier le courrier'}
              </Button>
            )}
          </Group>
        </Group>

        <Title order={1}>Modèle &quot;{template.name}&quot;</Title>

        {preview.hasInputs ? (
          <TemplatePreviewWithForm
            templateContent={template.content}
            resultLabel="Résultat"
            formRef={preview.formRef}
            onFormChange={preview.setFormContent}
            resultContent={preview.resultContent}
            onResultChange={preview.setEditedContent}
            isManuallyEdited={preview.isManuallyEdited}
            onRegenerate={preview.handleRegenerate}
          />
        ) : (
          <Stack gap="md">
            <Text size="sm" fw={600}>
              Résultat
            </Text>
            <Paper p="md" withBorder>
              <Textarea
                value={preview.resultContent}
                onChange={(e) => preview.setEditedContent(e.currentTarget.value)}
                minRows={24}
                autosize
                styles={{
                  input: {
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  },
                }}
              />
            </Paper>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => router.push(routes.employee.mails)}>
                Fermer
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
