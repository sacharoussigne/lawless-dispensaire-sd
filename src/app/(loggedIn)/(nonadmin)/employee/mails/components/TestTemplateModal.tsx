'use client';

import { useState, useMemo, useEffect } from 'react';
import { Modal, Stack, Paper, Text, ScrollArea, Button, Group, Grid } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { TemplateFormGenerator } from './TemplateFormGenerator';
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
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const hasInputs = useMemo(() => {
    if (!template) return false;
    return extractInputs(template.content).length > 0;
  }, [template?.content]);
  
  const initialContent = useMemo(() => {
    if (!template) return '';
    if (!hasInputs) {
      const context: RenderContext = { inputs: {} };
      return renderTemplate(template.content, context);
    }
    return '';
  }, [template?.content, hasInputs]);

  useEffect(() => {
    if (!hasInputs && initialContent) {
      setRenderedContent(initialContent);
    }
  }, [hasInputs, initialContent]);

  const handleChange = (content: string) => {
    setRenderedContent(content);
  };

  const handleCopy = async () => {
    if (!renderedContent) return;

    try {
      await navigator.clipboard.writeText(renderedContent);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Courrier copié dans le presse-papiers',
        color: 'green',
      });
      // Réinitialiser l'état après 2 secondes
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'red',
      });
    }
  };

  const handleClose = () => {
    setRenderedContent('');
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
        body: { minHeight: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
      }}
    >
      {hasInputs ? (
        <Grid gutter="md" style={{ height: '100%' }}>
          <Grid.Col span={4}>
            <Stack gap="md" h="100%">
              <Text size="sm" fw={600}>
                Formulaire
              </Text>
              <ScrollArea style={{ flex: 1 }}>
                <TemplateFormGenerator
                  template={template.content}
                  onChange={handleChange}
                  onCancel={handleClose}
                />
              </ScrollArea>
              {renderedContent && (
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
              <Text size="sm" fw={600}>
                Aperçu
              </Text>
              <Paper p="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ScrollArea style={{ flex: 1, height: 500 }}>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>
                    {renderedContent || 'Remplissez le formulaire pour voir l\'aperçu...'}
                  </Text>
                </ScrollArea>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      ) : (
        <Stack gap="md">
          <Paper p="md" withBorder>
            <Text size="sm" fw={600} mb="xs">
              Contenu généré :
            </Text>
            <ScrollArea h={600}>
              <Text style={{ whiteSpace: 'pre-wrap' }}>
                {renderedContent || initialContent}
              </Text>
            </ScrollArea>
          </Paper>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleClose}>
              Fermer
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
