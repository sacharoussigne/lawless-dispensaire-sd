'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Stack,
  Text,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import classes from '../agenda.module.scss';

interface DeleteTodoListButtonProps {
  listName: string;
  onConfirm: () => void;
}

export function DeleteTodoListButton({ listName, onConfirm }: DeleteTodoListButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      position="bottom-end"
      withArrow
      shadow="md"
      opened={open}
      onChange={setOpen}
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="danger"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label="Supprimer la liste"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs" className={classes.todoDeleteConfirm}>
          <Text size="sm" fw={500}>Supprimer la liste ?</Text>
          <Text size="xs" c="dimmed">
            « {listName} » et tout son contenu seront supprimés.
          </Text>
          <Group gap="xs" justify="flex-end" mt={4}>
            <Button
              size="xs"
              variant="subtle"
              color="slate"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              size="xs"
              color="danger"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
