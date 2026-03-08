'use client';

import { useMemo } from 'react';
import { Textarea, Stack, Text, Paper } from '@mantine/core';
import { parseTemplateParameters } from '@/lib/mailTemplate/parser';
import { DetectedParameters } from './DetectedParameters';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minRows?: number;
  hideParameters?: boolean;
  fixedHeight?: boolean;
}

export function TemplateEditor({
  value,
  onChange,
  label = 'Contenu',
  placeholder,
  required,
  minRows = 10,
  hideParameters = false,
  fixedHeight = false,
}: TemplateEditorProps) {
  const hasParameters = useMemo(() => {
    if (hideParameters) return false;
    const parameters = parseTemplateParameters(value);
    return parameters.length > 0;
  }, [value, hideParameters]);

  return (
    <Stack gap="sm">
      <Textarea
        label={label}
        placeholder={placeholder}
        required={required}
        minRows={fixedHeight ? undefined : minRows}
        autosize={!fixedHeight}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        styles={fixedHeight ? {
          input: {
            border: 'none',
            padding: 0,
            minHeight: '500px',
            resize: 'none',
          },
          wrapper: {
            border: 'none',
          },
          label: {
            display: 'none',
          },
        } : undefined}
      />

      {!hideParameters && hasParameters && (
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Paramètres détectés
            </Text>
            <DetectedParameters content={value} />
            <Text size="xs" c="dimmed" mt="xs">
              <strong>Syntaxe :</strong>
              <br />
              JavaScript: {'{js:code:endjs}'}
              <br />
              Input: {'{input:[type="text"][name="nom"][label="Label"][placeholder="..."][required="true"][default="valeur" ou default={js:code:endjs}]}'}
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
