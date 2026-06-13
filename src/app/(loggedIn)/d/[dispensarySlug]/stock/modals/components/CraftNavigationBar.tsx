'use client';

import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';

export function CraftNavigationBar(props: {
  depth: number;
  onBack: () => void;
  onReset: () => void;
}) {
  const { depth, onBack, onReset } = props;

  if (depth <= 0) return null;

  return (
    <Group justify="space-between">
      <Group gap="xs">
        <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
          Retour
        </Button>
        <Tooltip label="Réinitialiser la navigation">
          <ActionIcon variant="subtle" color="danger" onClick={onReset} aria-label="Réinitialiser la navigation">
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text size="xs" c="dimmed">
        Sous-craft ({depth})
      </Text>
    </Group>
  );
}

