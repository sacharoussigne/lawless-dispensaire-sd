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
              Input texte:{' '}
              {
                '{input:[type="text"][name="nom"][label="Label"][placeholder="..."][required="true"]}'
              }
              <br />
              Input textarea:{' '}
              {
                '{input:[type="textarea"][name="corps"][label="Corps"][placeholder="..."]}'
              }
              <br />
              Checkbox:{' '}
              {
                "{input:[type=\"checkbox\"][name=\"adr\"][label=\"Seringue d'Adrénaline\"][checkedValue=\"- Seringue d'Adrénaline:\\n\"]}"
              }
              <br />
              Complément conditionnel (inline):{' '}
              {
                '{input:[type="text"][name="adr_detail"][dependsOn="adr"][placeholder="Préciser..."]}'
              }
              <br />
              Complément conditionnel (sous la checkbox):{' '}
              {
                '{input:[type="text"][name="adr_detail"][dependsOn="adr"][layout="below"][placeholder="Préciser..."]}'
              }
              <br />
              Catégorie (formulaire uniquement):{' '}
              {'{category:"Signes observés"}'}
              <br />
              Échappements dans les valeurs : \\n (retour ligne), \\t (tabulation), \\\\ (antislash)
              <br />
              Valeur par défaut dynamique:{' '}
              {'default={js:(()=>"valeur")():endjs}'}
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
