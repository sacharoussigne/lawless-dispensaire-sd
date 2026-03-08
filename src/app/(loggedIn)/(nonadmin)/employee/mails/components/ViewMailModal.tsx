'use client';

import { Modal, Paper, Text, ScrollArea, Button, Stack, Group } from '@mantine/core';
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
        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb="xs">
            Destinataire :
          </Text>
          <Text>{mail.receiver}</Text>
        </Paper>

        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb="xs">
            Contenu :
          </Text>
          <ScrollArea h={400}>
            <Text style={{ whiteSpace: 'pre-wrap' }}>
              {mail.content}
            </Text>
          </ScrollArea>
        </Paper>

        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb="xs">
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
        </Paper>

        <Group justify="flex-end" mt="md">
          <Button
            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            onClick={handleCopy}
            variant={copied ? 'light' : 'default'}
            color={copied ? 'green' : undefined}
          >
            {copied ? 'Copiée !' : 'Copier le contenu'}
          </Button>
          <Button variant="subtle" onClick={onClose}>
            Fermer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
