'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Stack,
  Paper,
  Text,
  Textarea,
  ScrollArea,
  Button,
  Group,
  Grid,
} from '@mantine/core';
import { IconCopy, IconCheck, IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  TemplateFormGenerator,
  type TemplateFormGeneratorHandle,
} from '../../../components/TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';
import type { MailTemplate } from '@/types/mailTemplates';

interface TestTemplatePageClientProps {
  template: MailTemplate;
}

export default function TestTemplatePageClient({
  template,
}: TestTemplatePageClientProps) {
  const routes = useTenantRoutes();
  const router = useRouter();
  const formRef = useRef<TemplateFormGeneratorHandle>(null);
  const [formContent, setFormContent] = useState('');
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasInputs = useMemo(() => {
    return extractInputs(template.content).length > 0;
  }, [template.content]);

  const staticContent = useMemo(() => {
    if (hasInputs) return '';
    const context: RenderContext = { inputs: {} };
    return renderTemplate(template.content, context);
  }, [template.content, hasInputs]);

  const autoContent = hasInputs ? formContent : staticContent;
  const resultContent = editedContent ?? autoContent;
  const isManuallyEdited = editedContent !== null;

  const handleFormChange = (content: string) => {
    setFormContent(content);
  };

  const handleResultChange = (value: string) => {
    setEditedContent(value);
  };

  const handleRegenerate = () => {
    setEditedContent(null);
  };

  const handleResetAll = () => {
    formRef.current?.reset();
    setEditedContent(null);
  };

  const handleCopy = async () => {
    if (!resultContent) return;

    try {
      await navigator.clipboard.writeText(resultContent);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Courrier copié dans le presse-papiers',
        color: 'green',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'red',
      });
    }
  };

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
            {hasInputs && (
              <Button
                variant="subtle"
                leftSection={<IconRefresh size={16} />}
                onClick={handleResetAll}
              >
                Réinitialiser
              </Button>
            )}
            {resultContent && (
              <Button
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                onClick={handleCopy}
                variant={copied ? 'light' : 'default'}
                color={copied ? 'green' : undefined}
              >
                {copied ? 'Copiée !' : 'Copier le courrier'}
              </Button>
            )}
          </Group>
        </Group>

        <Title order={1}>Modèle &quot;{template.name}&quot;</Title>

        {hasInputs ? (
          <Grid gutter="xl">
            <Grid.Col span={5}>
              <Stack gap="md">
                <Text size="sm" fw={600}>
                  Formulaire
                </Text>
                <Paper p="md" withBorder>
                  <ScrollArea h={600} scrollbars="y" type="auto">
                    <TemplateFormGenerator
                      ref={formRef}
                      template={template.content}
                      onChange={handleFormChange}
                    />
                  </ScrollArea>
                </Paper>
              </Stack>
            </Grid.Col>
            <Grid.Col span={7}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Résultat
                  </Text>
                  {isManuallyEdited && (
                    <Button variant="subtle" size="xs" onClick={handleRegenerate}>
                      Réappliquer le formulaire
                    </Button>
                  )}
                </Group>
                <Paper p="md" withBorder>
                  <Textarea
                    value={resultContent}
                    onChange={(e) => handleResultChange(e.currentTarget.value)}
                    placeholder="Remplissez le formulaire pour générer le résultat…"
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
              </Stack>
            </Grid.Col>
          </Grid>
        ) : (
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Résultat
              </Text>
              {isManuallyEdited && (
                <Button variant="subtle" size="xs" onClick={handleRegenerate}>
                  Réappliquer le formulaire
                </Button>
              )}
            </Group>
            <Paper p="md" withBorder>
              <Textarea
                value={resultContent}
                onChange={(e) => handleResultChange(e.currentTarget.value)}
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
              <Button
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                onClick={handleCopy}
                variant={copied ? 'light' : 'default'}
                color={copied ? 'green' : undefined}
              >
                {copied ? 'Copiée !' : 'Copier le courrier'}
              </Button>
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
