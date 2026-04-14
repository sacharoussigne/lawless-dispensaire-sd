'use client';

import { useState } from 'react';
import { ActionIcon, Autocomplete, Group, Popover, Stack, Text, Button } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

interface SuggestionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onAddSuggestion: (value: string) => Promise<void>;
  onDeleteSuggestion: (value: string, e?: React.MouseEvent) => Promise<void>;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function SuggestionAutocomplete({
  value,
  onChange,
  suggestions,
  onAddSuggestion,
  onDeleteSuggestion,
  placeholder = '',
  size = 'xs',
}: SuggestionAutocompleteProps) {
  const [deleteMenuForValue, setDeleteMenuForValue] = useState<string | null>(null);

  const canAddSuggestion =
    value &&
    value.trim().length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === value.toLowerCase().trim());

  return (
    <Autocomplete
      data={suggestions}
      value={value}
      onChange={onChange}
      size={size}
      placeholder={placeholder}
      renderOption={({ option }) => (
        <Group justify="space-between" style={{ flex: 1 }}>
          <Text size="xs" style={{ flex: 1 }}>
            {option.value}
          </Text>
          <Popover
            position="top"
            withArrow
            shadow="md"
            withinPortal
            opened={deleteMenuForValue === option.value}
            onChange={(opened) => {
              if (!opened) setDeleteMenuForValue(null);
            }}
          >
            <Popover.Target>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteMenuForValue((v) =>
                    v === option.value ? null : option.value,
                  );
                }}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs" p="xs">
                <Text size="sm" fw={500}>
                  Supprimer la suggestion
                </Text>
                <Text size="xs" c="dimmed">
                  Supprimer &quot;{option.value}&quot; des suggestions ?
                </Text>
                <Group gap="xs" justify="flex-end" mt="xs">
                  <Button
                    size="xs"
                    variant="subtle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteMenuForValue(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void (async () => {
                        await onDeleteSuggestion(option.value, e);
                        setDeleteMenuForValue(null);
                      })();
                    }}
                  >
                    Supprimer
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      )}
      comboboxProps={{ withinPortal: true }}
      rightSection={
        canAddSuggestion ? (
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={(e) => {
              e?.stopPropagation();
              onAddSuggestion(value);
            }}
          >
            <IconPlus size={14} />
          </ActionIcon>
        ) : null
      }
    />
  );
}
