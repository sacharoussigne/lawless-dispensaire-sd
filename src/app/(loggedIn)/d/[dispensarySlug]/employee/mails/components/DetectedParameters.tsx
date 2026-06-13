'use client';

import { useMemo } from 'react';
import { Stack, Text, Group, Badge, Code } from '@mantine/core';
import { IconCode, IconForms } from '@tabler/icons-react';
import { parseTemplateParameters } from '@/lib/mailTemplate/parser';

interface DetectedParametersProps {
  content: string;
}

export function DetectedParameters({ content }: DetectedParametersProps) {
  const parsed = useMemo(() => {
    const parameters = parseTemplateParameters(content);
    const inputs = parameters
      .filter((p) => p.type === 'input' && p.input)
      .map((p) => p.input!);
    const jsCodes = parameters
      .filter((p) => p.type === 'js' && p.jsCode)
      .map((p) => p.jsCode!);

    const formSections: { title?: string; inputs: typeof inputs }[] = [
      { inputs: [] },
    ];
    const seenInputNames = new Set<string>();

    for (const param of parameters) {
      if (param.type === 'category') {
        formSections.push({ title: param.categoryTitle, inputs: [] });
        continue;
      }
      if (param.type !== 'input' || !param.input) continue;
      if (param.input.dependsOn) continue;
      if (seenInputNames.has(param.input.name)) continue;
      seenInputNames.add(param.input.name);
      formSections[formSections.length - 1].inputs.push(param.input);
    }

    const sections = formSections.filter(
      (section) => section.title || section.inputs.length > 0,
    );

    return { parameters, inputs, jsCodes, formSections: sections };
  }, [content]);

  const { parameters, inputs, jsCodes, formSections } = parsed;
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
                      <Badge variant="light" color="denim">
                        {input.name}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {input.label} ({input.type})
                        {input.required && (
                          <Badge size="xs" color="danger" variant="dot" ml="xs">
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
            ),
          )}
        </Stack>
      )}
    </Stack>
  );
}
