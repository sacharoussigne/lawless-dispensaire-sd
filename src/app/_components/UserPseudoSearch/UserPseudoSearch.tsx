'use client';

import { useEffect, useState } from 'react';
import { Button, Group, Stack, Text, TextInput } from '@mantine/core';

export type UserPseudoSearchResult = { id: string; name: string };

export type UserPseudoSearchProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  inputName: string;
  enabled?: boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
  excludeUserIds?: string[];
  onSearch: (query: string) => Promise<UserPseudoSearchResult[]>;
  onSelect: (user: UserPseudoSearchResult) => void;
  actionLabel?: string;
  hideResults?: boolean;
  clearQueryOnSelect?: boolean;
};

export function UserPseudoSearch({
  label = 'Rechercher un utilisateur',
  description = '',
  placeholder = 'Pseudo…',
  inputName,
  enabled = true,
  query,
  onQueryChange,
  excludeUserIds,
  onSearch,
  onSelect,
  actionLabel = 'Sélectionner',
  hideResults = false,
  clearQueryOnSelect = true,
}: UserPseudoSearchProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [results, setResults] = useState<UserPseudoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const isControlled = query !== undefined;
  const currentQuery = isControlled ? query : internalQuery;

  const setCurrentQuery = (next: string) => {
    if (isControlled) {
      onQueryChange?.(next);
    } else {
      setInternalQuery(next);
    }
  };

  const excludeIdsKey = excludeUserIds?.join(',') ?? '';

  useEffect(() => {
    if (!enabled || currentQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const exclude = new Set(excludeUserIds ?? []);

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await onSearch(currentQuery);
        setResults(data.filter((user) => !exclude.has(user.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
    // excludeIdsKey mirrors excludeUserIds without unstable array reference
    // eslint-disable-next-line react-hooks/exhaustive-deps -- excludeUserIds read via excludeIdsKey
  }, [currentQuery, enabled, excludeIdsKey, onSearch]);

  const handleSelect = (user: UserPseudoSearchResult) => {
    onSelect(user);
    if (clearQueryOnSelect) {
      setCurrentQuery('');
    }
    setResults([]);
  };

  return (
    <Stack gap="xs">
      <TextInput
        label={label}
        description={description}
        placeholder={placeholder}
        value={currentQuery}
        onChange={(e) => setCurrentQuery(e.currentTarget.value)}
        name={inputName}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
      {searching && (
        <Text size="xs" c="dimmed">
          Recherche…
        </Text>
      )}
      {!hideResults && results.length > 0 && (
        <Stack gap={4}>
          {results.map((user) => (
            <Group key={user.id} justify="space-between">
              <Text size="sm">{user.name}</Text>
              <Button
                size="xs"
                color="sage"
                variant="light"
                onClick={() => handleSelect(user)}
              >
                {actionLabel}
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
