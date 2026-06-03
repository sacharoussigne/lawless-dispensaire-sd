'use client';

import { useMemo } from 'react';
import { Stack, Text, Group, Badge, Code } from '@mantine/core';
import { IconCode, IconForms } from '@tabler/icons-react';
import {
  parseTemplateParameters,
  extractInputs,
  extractJsCode,
  extractFormSections,
} from '@/lib/mailTemplate/parser';

interface DetectedParametersProps {
  content: string;
}

export function DetectedParameters({ content }: DetectedParametersProps) {
  const parameters = useMemo(
    () => parseTemplateParameters(content),
    [content]
  );
  const inputs = useMemo(() => extractInputs(content), [content]);
  const jsCodes = useMemo(() => extractJsCode(content), [content]);
  const formSections = useMemo(() => extractFormSections(content), [content]);
  const hasCategories = formSections.some((section) => section.title);

  if (parameters.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Aucun paramètre détecté
      </Text>
    );
  }

  return (
    <Stack gap="md">
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
          {(hasCategories ? formSections : [{ inputs }]).map(
            (section, sectionIndex) => (
              <Stack key={`section-${sectionIndex}`} gap="xs">
                {section.title && (
                  <Text size="xs" fw={600} c="dimmed">
                    {section.title}
                  </Text>
                )}
                {section.inputs.map((input) => (
                  <Stack key={input.name} gap="xs">
                    <Group gap="xs">
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
                    {input.placeholder && (
                      <Text size="xs" c="dimmed" pl="md">
                        Placeholder: {input.placeholder}
                      </Text>
                    )}
                    {input.checkedValue && (
                      <Text size="xs" c="dimmed" pl="md">
                        Si coché: {input.checkedValue}
                      </Text>
                    )}
                    {input.dependsOn && (
                      <Text size="xs" c="dimmed" pl="md">
                        Dépend de: {input.dependsOn}
                        {input.layout === 'below' && ' (sous la checkbox)'}
                      </Text>
                    )}
                    {input.defaultValue && (
                      <Text size="xs" c="dimmed" pl="md">
                        Défaut: {input.defaultValue}
                      </Text>
                    )}
                  </Stack>
                ))}
              </Stack>
            )
          )}
        </Stack>
      )}
    </Stack>
  );
}
