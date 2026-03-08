'use client';

import { Modal, Paper, Text, Button, Stack, Group, Grid } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { Mail } from '@prisma/client';

interface ViewMailModalProps {
  opened: boolean;
  onClose: () => void;
  mail: Mail | null;
}

export function ViewMailModal({
  opened,
  onClose,
  mail,
}: ViewMailModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!mail) return;

    try {
      await navigator.clipboard.writeText(mail.content);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Courrier copié dans le presse-papiers',
        color: 'green',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'red',
      });
    }
  };

  if (!mail) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Courrier: ${mail.name}`}
      size="70%"
    >
      <Stack gap="md">
        <Group justify="space-between">
          <div className="flex gap-4">
            <Paper p="md" withBorder>
              <div className="flex items-center gap-2">
                <Text size="sm" fw={600}>
                  Destinataire :
                </Text>
                <Text>{mail.receiver}</Text>
              </div>
            </Paper>
            <Paper p="md" withBorder>
              <div className="flex items-center gap-2">
                <Text size="sm" fw={600}>
                  Date de création :
                </Text>
                <Text>
                  {new Date(mail.createdAt).toLocaleString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </div>
            </Paper>
          </div>
          <Button
            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            onClick={handleCopy}
            variant={copied ? 'light' : 'default'}
            color={copied ? 'green' : undefined}
          >
            {copied ? 'Copiée !' : 'Copier le contenu'}
          </Button>

        </Group>

        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb="xs">
            Contenu :
          </Text>
          <Text style={{ whiteSpace: 'pre-wrap' }}>
            {mail.content}
          </Text>
        </Paper>
      </Stack>
    </Modal>
  );
}
