'use client';

import {
  ActionIcon,
  Drawer,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { AgendaTodoListDTO } from '@/types/agenda';

interface AgendaTodoArchivesDrawerProps {
  opened: boolean;
  onClose: () => void;
  lists: AgendaTodoListDTO[];
  canWrite: boolean;
  onDeleteTask: (id: string) => void;
}

export function AgendaTodoArchivesDrawer({
  opened,
  onClose,
  lists,
  canWrite,
  onDeleteTask,
}: AgendaTodoArchivesDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={<Title order={4} className="disp-display-title">Archives</Title>}
      position="right"
      size="md"
    >
      <Stack gap="lg">
        {lists.length === 0 && (
          <Text c="dimmed" size="sm">Aucune tâche terminée archivée.</Text>
        )}
        {lists.map((list) => (
          <Stack key={list.id} gap="sm">
            <Text fw={600}>{list.name}</Text>
            {list.categories.map((category) => (
              <Stack key={category.id} gap="xs" pl="sm">
                <Text size="sm" c="dimmed">{category.name}</Text>
                {category.tasks.map((task) => (
                  <Group key={task.id} justify="space-between" wrap="nowrap">
                    <Text size="sm" className="line-through" c="dimmed" style={{ flex: 1 }}>
                      {task.title}
                    </Text>
                    {canWrite && (
                      <ActionIcon
                        variant="subtle"
                        color="danger"
                        size="sm"
                        onClick={() => onDeleteTask(task.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
              </Stack>
            ))}
          </Stack>
        ))}
      </Stack>
    </Drawer>
  );
}
