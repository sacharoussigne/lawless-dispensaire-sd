'use client';

import { ActionIcon, Group, Modal, Paper, Text, UnstyledButton } from '@mantine/core';
import { IconGripVertical, IconPhoto, IconTrash } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';

export function PayrollSortableFileRow({
  id,
  file,
  index,
  onRemove,
}: {
  id: string;
  file: File;
  index: number;
  onRemove: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={file.name}
        size="xl"
        centered
      >
        {objectUrl && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: 'min(70vh, 800px)',
              overflow: 'auto',
            }}
          >
            <img
              src={objectUrl}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: 'min(70vh, 800px)', objectFit: 'contain' }}
            />
          </div>
        )}
      </Modal>

      <Paper withBorder p="xs" radius="sm">
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <div
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', display: 'flex', flexShrink: 0, color: 'var(--mantine-color-dimmed)' }}
            >
              <IconGripVertical size={20} />
            </div>
            <Text size="sm" c="dimmed" w={28} style={{ flexShrink: 0 }}>
              {index + 1}.
            </Text>
            {objectUrl && (
              <UnstyledButton
                type="button"
                onClick={() => setPreviewOpen(true)}
                style={{ flexShrink: 0, borderRadius: 4, overflow: 'hidden' }}
                title="Agrandir l’aperçu"
              >
                <img
                  src={objectUrl}
                  alt=""
                  width={56}
                  height={56}
                  style={{ objectFit: 'cover', display: 'block' }}
                />
              </UnstyledButton>
            )}
            <Text size="sm" fw={500} truncate style={{ flex: 1 }}>
              {file.name}
            </Text>
          </Group>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Prévisualiser"
              title="Prévisualiser"
              onClick={() => setPreviewOpen(true)}
            >
              <IconPhoto size={18} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" aria-label="Retirer" onClick={onRemove}>
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>
    </div>
  );
}
