'use client';

import { useMemo, useEffect } from 'react';
import { Stack, TextInput, Textarea, NumberInput, Select, Switch, Button, Group, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { extractInputs, TemplateInput } from '@/lib/mailTemplate/parser';
import { renderTemplate, RenderContext, resolveJsValue } from '@/lib/mailTemplate/renderer';

interface TemplateFormGeneratorProps {
  template: string;
  onSubmit?: (renderedContent: string) => void;
  onCancel?: () => void;
  onChange?: (renderedContent: string) => void;
}

export function TemplateFormGenerator({
  template,
  onSubmit,
  onCancel,
  onChange,
}: TemplateFormGeneratorProps) {
  const inputs = useMemo(() => extractInputs(template), [template]);

  const form = useForm({
    initialValues: inputs.reduce((acc, input) => {
      // Résoudre la valeur par défaut (exécuter le JS si présent)
      const resolvedValue = resolveJsValue(input.defaultValue);
      
      if (input.type === 'number') {
        acc[input.name] = resolvedValue ? Number(resolvedValue) : undefined;
      } else {
        acc[input.name] = resolvedValue || '';
      }
      return acc;
    }, {} as Record<string, string | number | undefined>),
  });

  const renderContent = (values: Record<string, string | number | undefined>) => {
    const context: RenderContext = {
      inputs: Object.entries(values).reduce((acc, [key, value]) => {
        acc[key] = value !== null && value !== undefined ? String(value) : '';
        return acc;
      }, {} as Record<string, string>),
    };
    return renderTemplate(template, context);
  };

  const handleSubmit = (values: Record<string, string | number | undefined>) => {
    const renderedContent = renderContent(values);
    if (onSubmit) {
      onSubmit(renderedContent);
    }
  };

  const handleChange = () => {
    if (onChange) {
      const renderedContent = renderContent(form.values);
      onChange(renderedContent);
    }
  };

  useEffect(() => {
    if (onChange) {
      const context: RenderContext = {
        inputs: Object.entries(form.values).reduce((acc, [key, value]) => {
          acc[key] = value !== null && value !== undefined ? String(value) : '';
          return acc;
        }, {} as Record<string, string>),
      };
      const renderedContent = renderTemplate(template, context);
      onChange(renderedContent);
    }
  }, [form.values, template]);

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

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {inputs.length === 0 ? (
          <Text c="dimmed" size="sm">
            Ce template ne contient pas d'inputs personnalisés. Le contenu sera généré automatiquement.
          </Text>
        ) : (
          inputs.map((input) => renderInput(input))
        )}
        {onSubmit && (
          <Group justify="flex-end" mt="md">
            {onCancel && (
              <Button variant="subtle" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button type="submit">
              Générer le courrier
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
}
