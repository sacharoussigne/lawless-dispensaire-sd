'use client';

import { useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  Checkbox,
  Flex,
  Box,
  Text,
  Divider,
  Button,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  extractInputs,
  extractFormSections,
  type TemplateInput,
} from '@/lib/mailTemplate/parser';
import {
  renderTemplate,
  type RenderContext,
  resolveJsValue,
} from '@/lib/mailTemplate/renderer';

type FormValues = Record<string, string | number | boolean | undefined>;

function buildInitialValues(inputs: TemplateInput[]): FormValues {
  return inputs.reduce((acc, input) => {
    const resolvedValue = resolveJsValue(input.defaultValue);

    if (input.type === 'number') {
      acc[input.name] = resolvedValue ? Number(resolvedValue) : undefined;
    } else if (input.type === 'checkbox') {
      acc[input.name] = resolvedValue === 'true' || resolvedValue === '1';
    } else {
      acc[input.name] = resolvedValue || '';
    }
    return acc;
  }, {} as FormValues);
}

export interface TemplateFormGeneratorHandle {
  reset: () => void;
}

interface TemplateFormGeneratorProps {
  template: string;
  onSubmit?: (renderedContent: string) => void;
  onCancel?: () => void;
  onChange?: (renderedContent: string) => void;
}

export const TemplateFormGenerator = forwardRef<
  TemplateFormGeneratorHandle,
  TemplateFormGeneratorProps
>(function TemplateFormGenerator(
  { template, onSubmit, onCancel, onChange },
  ref
) {
  const inputs = useMemo(() => extractInputs(template), [template]);

  const dependentsByParent = useMemo(() => {
    const map = new Map<string, TemplateInput[]>();
    for (const input of inputs) {
      if (!input.dependsOn) continue;
      const siblings = map.get(input.dependsOn) ?? [];
      siblings.push(input);
      map.set(input.dependsOn, siblings);
    }
    return map;
  }, [inputs]);

  const rootInputs = useMemo(
    () => inputs.filter((input) => !input.dependsOn),
    [inputs]
  );

  const formSections = useMemo(
    () => extractFormSections(template),
    [template]
  );

  const form = useForm({
    initialValues: buildInitialValues(inputs),
  });

  useImperativeHandle(ref, () => ({
    reset: () => form.reset(),
  }));

  const [debouncedValues] = useDebouncedValue(form.values, 200);

  const renderContent = (values: FormValues) => {
    const context: RenderContext = {
      inputs: Object.entries(values).reduce(
        (acc, [key, value]) => {
          if (typeof value === 'boolean') {
            acc[key] = value ? 'true' : 'false';
          } else {
            acc[key] =
              value !== null && value !== undefined ? String(value) : '';
          }
          return acc;
        },
        {} as Record<string, string>
      ),
    };
    return renderTemplate(template, context);
  };

  const handleSubmit = (values: FormValues) => {
    if (onSubmit) {
      onSubmit(renderContent(values));
    }
  };

  useEffect(() => {
    if (onChange) {
      onChange(renderContent(debouncedValues));
    }
  }, [debouncedValues, template]);

  const renderInput = (input: TemplateInput) => {
    const commonProps = {
      label: input.label,
      placeholder: input.placeholder,
      required: input.required,
    };

    switch (input.type) {
      case 'textarea':
        return (
          <Textarea
            key={input.name}
            {...commonProps}
            minRows={4}
            autosize
            {...form.getInputProps(input.name)}
          />
        );
      case 'number':
        return (
          <NumberInput
            key={input.name}
            {...commonProps}
            {...form.getInputProps(input.name)}
          />
        );
      case 'select':
        return (
          <Select
            key={input.name}
            {...commonProps}
            data={[]}
            searchable
            {...form.getInputProps(input.name)}
          />
        );
      case 'switch':
        return (
          <Switch
            key={input.name}
            label={input.label}
            {...form.getInputProps(input.name, { type: 'checkbox' })}
          />
        );
      case 'checkbox': {
        const dependents = dependentsByParent.get(input.name) ?? [];
        const isChecked = Boolean(form.values[input.name]);
        const inlineDependents = dependents.filter(
          (dependent) => dependent.layout !== 'below'
        );
        const belowDependents = dependents.filter(
          (dependent) => dependent.layout === 'below'
        );

        const renderDependentInput = (dependent: TemplateInput) => (
          <TextInput
            key={dependent.name}
            size="sm"
            label={
              dependent.label !== dependent.name ? dependent.label : undefined
            }
            placeholder={dependent.placeholder}
            required={dependent.required}
            {...form.getInputProps(dependent.name)}
          />
        );

        return (
          <Stack key={input.name} gap="xs" w="100%" miw={0}>
            <Flex align="center" gap="xs" wrap="nowrap" w="100%" miw={0}>
              <Checkbox
                label={input.label}
                style={{ flexShrink: 0 }}
                {...form.getInputProps(input.name, { type: 'checkbox' })}
              />
              {isChecked &&
                inlineDependents.map((dependent) => (
                  <TextInput
                    key={dependent.name}
                    size="sm"
                    placeholder={dependent.placeholder}
                    required={dependent.required}
                    miw={0}
                    flex={1}
                    {...form.getInputProps(dependent.name)}
                  />
                ))}
            </Flex>
            {isChecked &&
              belowDependents.map((dependent) => (
                <div key={dependent.name}>{renderDependentInput(dependent)}</div>
              ))}
          </Stack>
        );
      }
      default:
        return (
          <TextInput
            key={input.name}
            {...commonProps}
            {...form.getInputProps(input.name)}
          />
        );
    }
  };

  const canBeInRow = (input: TemplateInput) => {
    return (
      input.type !== 'textarea' &&
      input.type !== 'switch' &&
      input.type !== 'checkbox'
    );
  };

  const renderInputRows = (sectionInputs: TemplateInput[]) => {
    const rows: (TemplateInput | TemplateInput[])[] = [];
    let i = 0;

    while (i < sectionInputs.length) {
      const current = sectionInputs[i];

      if (!canBeInRow(current)) {
        rows.push(current);
        i++;
      } else {
        const next = sectionInputs[i + 1];
        if (next && canBeInRow(next)) {
          rows.push([current, next]);
          i += 2;
        } else {
          rows.push(current);
          i++;
        }
      }
    }

    return rows.map((row, index) => {
      if (Array.isArray(row)) {
        return (
          <Flex key={`row-${index}`} gap="md" w="100%" miw={0}>
            <Box flex={1} miw={0}>
              {renderInput(row[0])}
            </Box>
            <Box flex={1} miw={0}>
              {renderInput(row[1])}
            </Box>
          </Flex>
        );
      }
      return (
        <Box key={`input-${row.name}`} miw={0}>
          {renderInput(row)}
        </Box>
      );
    });
  };

  const renderInputs = () => {
    if (rootInputs.length === 0) {
      return (
        <Text c="dimmed" size="sm">
          Ce template ne contient pas d&apos;inputs personnalisés. Le contenu
          sera généré automatiquement.
        </Text>
      );
    }

    const hasCategories = formSections.some((section) => section.title);

    if (!hasCategories) {
      return renderInputRows(rootInputs);
    }

    return formSections.map((section, index) => (
      <Stack key={`section-${index}`} gap="sm" w="100%" miw={0}>
        {section.title && (
          <Flex align="center" gap="sm" w="100%" miw={0}>
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              lts="0.05em"
              c="denim.7"
              style={{ flexShrink: 0 }}
            >
              {section.title}
            </Text>
            <Divider style={{ flex: 1, minWidth: 0 }} />
          </Flex>
        )}
        {section.inputs.length > 0 && (
          <Stack gap="md">{renderInputRows(section.inputs)}</Stack>
        )}
      </Stack>
    ));
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack
        gap={formSections.some((section) => section.title) ? 'lg' : 'md'}
        w="100%"
        miw={0}
      >
        {renderInputs()}
        {onSubmit && (
          <Group justify="flex-end" mt="md">
            {onCancel && (
              <Button variant="subtle" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button type="submit">Générer le courrier</Button>
          </Group>
        )}
      </Stack>
    </form>
  );
});
