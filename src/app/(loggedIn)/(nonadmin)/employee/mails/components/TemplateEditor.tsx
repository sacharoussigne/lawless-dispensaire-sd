'use client';

import { useMemo } from 'react';
import { Textarea, Badge, Stack, Text, Group, Paper, Code } from '@mantine/core';
import { IconCode, IconForms } from '@tabler/icons-react';
import { parseTemplateParameters, extractInputs, extractJsCode } from '@/lib/mailTemplate/parser';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minRows?: number;
}

export function TemplateEditor({
  value,
  onChange,
  label = 'Contenu',
  placeholder,
  required,
  minRows = 10,
}: TemplateEditorProps) {
  const parameters = useMemo(() => parseTemplateParameters(value), [value]);
  const inputs = useMemo(() => extractInputs(value), [value]);
  const jsCodes = useMemo(() => extractJsCode(value), [value]);

  return (
    <Stack gap="sm">
      <Textarea
        label={label}
        placeholder={placeholder}
        required={required}
        minRows={minRows}
        autosize
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      />

      {(parameters.length > 0 || inputs.length > 0 || jsCodes.length > 0) && (
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Paramètres détectés
            </Text>

            {jsCodes.length > 0 && (
              <Stack gap="xs">
                <Group gap="xs">
                  <IconCode size={16} />
                  <Text size="sm" fw={500}>
                    Code JavaScript ({jsCodes.length})
                  </Text>
                </Group>
                {jsCodes.map((code, index) => (
                  <Code key={index} block>
                    {code}
                  </Code>
                ))}
              </Stack>
            )}

            {inputs.length > 0 && (
              <Stack gap="xs">
                <Group gap="xs">
                  <IconForms size={16} />
                  <Text size="sm" fw={500}>
                    Inputs ({inputs.length})
                  </Text>
                </Group>
                {inputs.map((input, index) => (
                  <Group key={index} gap="xs">
                    <Badge variant="light" color="blue">
                      {input.name}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {input.label} ({input.type})
                      {input.required && (
                        <Badge size="xs" color="red" variant="dot" ml="xs">
                          Requis
                        </Badge>
                      )}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}

            <Text size="xs" c="dimmed" mt="xs">
              <strong>Syntaxe :</strong>
              <br />
              JavaScript: {'{js:code}'}
              <br />
              Input: {'{input:[type="text"][name="nom"][label="Label"][placeholder="..."][required="true"]}'}
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
