'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Modal,
  Stack,
  Paper,
  Text,
  Textarea,
  ScrollArea,
  Button,
  Group,
  Grid,
} from '@mantine/core';
import { IconCopy, IconCheck, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  TemplateFormGenerator,
  type TemplateFormGeneratorHandle,
} from './TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';
import type { MailTemplate } from '@/types/mailTemplates';

interface TestTemplateModalProps {
  opened: boolean;
  onClose: () => void;
  template: MailTemplate | null;
}

export function TestTemplateModal({
  opened,
  onClose,
  template,
}: TestTemplateModalProps) {
  const formRef = useRef<TemplateFormGeneratorHandle>(null);
  const [formContent, setFormContent] = useState('');
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasInputs = useMemo(() => {
    if (!template) return false;
    return extractInputs(template.content).length > 0;
  }, [template?.content]);

  const staticContent = useMemo(() => {
    if (!template || hasInputs) return '';
    const context: RenderContext = { inputs: {} };
    return renderTemplate(template.content, context);
  }, [template?.content, hasInputs]);

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

  const handleClose = () => {
    setFormContent('');
    setEditedContent(null);
    setCopied(false);
    onClose();
  };

  if (!template) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Tester le template: ${template.name}`}
      size="70%"
      styles={{
        body: {
          minHeight: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {hasInputs ? (
        <Grid gutter="md" style={{ height: '100%' }}>
          <Grid.Col span={4}>
            <Stack gap="md" h="100%">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  Formulaire
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconRefresh size={14} />}
                  onClick={handleResetAll}
                >
                  Réinitialiser
                </Button>
              </Group>
              <ScrollArea style={{ flex: 1 }}>
                <TemplateFormGenerator
                  ref={formRef}
                  template={template.content}
                  onChange={handleFormChange}
                />
              </ScrollArea>
              {resultContent && (
                <Button
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  onClick={handleCopy}
                  variant={copied ? 'light' : 'default'}
                  color={copied ? 'green' : undefined}
                  fullWidth
                >
                  {copied ? 'Copiée !' : 'Copier le courrier'}
                </Button>
              )}
            </Stack>
          </Grid.Col>
          <Grid.Col span={8}>
            <Stack gap="md" h="100%">
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
              <Paper
                p="md"
                withBorder
                style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
              >
                <Textarea
                  value={resultContent}
                  onChange={(e) => handleResultChange(e.currentTarget.value)}
                  placeholder="Remplissez le formulaire pour générer le résultat…"
                  minRows={20}
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
              Contenu généré
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
              minRows={20}
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
            <Button variant="subtle" onClick={handleClose}>
              Fermer
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
