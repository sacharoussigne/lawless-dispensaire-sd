'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Stack,
  Paper,
  Text,
  Textarea,
  ScrollArea,
  Button,
  Group,
  Grid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  TemplateFormGenerator,
  type TemplateFormGeneratorHandle,
} from './TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';

export function useTemplatePreviewActions(templateContent: string) {
  const formRef = useRef<TemplateFormGeneratorHandle>(null);
  const [formContent, setFormContent] = useState('');
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasInputs = useMemo(
    () => extractInputs(templateContent).length > 0,
    [templateContent],
  );

  const staticContent = useMemo(() => {
    if (hasInputs) return '';
    const context: RenderContext = { inputs: {} };
    return renderTemplate(templateContent, context);
  }, [templateContent, hasInputs]);

  const autoContent = hasInputs ? formContent : staticContent;
  const resultContent = editedContent ?? autoContent;
  const isManuallyEdited = editedContent !== null;

  useEffect(() => {
    setFormContent('');
    setEditedContent(null);
    formRef.current?.reset();
  }, [templateContent]);

  const resetTemplateForm = () => {
    formRef.current?.reset();
    setEditedContent(null);
  };

  const handleRegenerate = () => {
    setEditedContent(null);
  };

  const handleCopy = async (content?: string) => {
    const contentToCopy = content ?? resultContent;
    if (!contentToCopy) return;

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Courrier copié dans le presse-papiers',
        color: 'moss',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'danger',
      });
    }
  };

  return {
    formRef,
    hasInputs,
    formContent,
    setFormContent,
    editedContent,
    setEditedContent,
    resultContent,
    isManuallyEdited,
    copied,
    resetTemplateForm,
    handleRegenerate,
    handleCopy,
  };
}

interface TemplatePreviewWithFormProps {
  templateContent: string;
  resultLabel?: string;
  formRef: React.RefObject<TemplateFormGeneratorHandle | null>;
  onFormChange: (content: string) => void;
  resultContent: string;
  onResultChange: (value: string) => void;
  isManuallyEdited: boolean;
  onRegenerate: () => void;
}

export function TemplatePreviewWithForm({
  templateContent,
  resultLabel = 'Aperçu',
  formRef,
  onFormChange,
  resultContent,
  onResultChange,
  isManuallyEdited,
  onRegenerate,
}: TemplatePreviewWithFormProps) {
  return (
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
                template={templateContent}
                onChange={onFormChange}
              />
            </ScrollArea>
          </Paper>
        </Stack>
      </Grid.Col>
      <Grid.Col span={7}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {resultLabel}
            </Text>
            {isManuallyEdited && (
              <Button variant="subtle" size="xs" onClick={onRegenerate}>
                Réappliquer le formulaire
              </Button>
            )}
          </Group>
          <Paper p="md" withBorder>
            <Textarea
              value={resultContent}
              onChange={(e) => onResultChange(e.currentTarget.value)}
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
  );
}
