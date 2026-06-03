'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect, useState } from 'react';
import { Modal, Stack, Text, Button, Group, Loader, Paper } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { generateOrderMailPreview } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import type { OrderWithRelations } from '@/types/orders';

interface OrderLetterPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  order: OrderWithRelations | null;
}

export function OrderLetterPreviewModal({
  opened,
  onClose,
  order,
}: OrderLetterPreviewModalProps) {
  const { dispensarySlug } = usePermissions();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (opened && order) {
      loadPreview();
    } else {
      setPreview(null);
    }
  }, [opened, order]);

  const loadPreview = async () => {
    if (!order) return;

    try {
      setLoading(true);
      const result = await generateOrderMailPreview(dispensarySlug!, { orderId: order.id });
      const data = handleAction(result);
      if (data) {
        setPreview(data.preview);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement de l\'aperçu',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!preview) return;

    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      notifications.show({
        title: 'Succès',
        message: 'Courrier copié dans le presse-papiers',
        color: 'green',
      });
      // Réinitialiser l'état après 2 secondes
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Aperçu du courrier"
      size="lg"
    >
      <Stack>
        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : preview ? (
          <Paper p="md" withBorder>
            <Text
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              {preview}
            </Text>
          </Paper>
        ) : (
          <Text c="dimmed">Aucun aperçu disponible</Text>
        )}
        <Group justify="flex-end" mt="md">
          {preview && (
            <Button
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              onClick={handleCopy}
              variant={copied ? 'light' : 'default'}
              color={copied ? 'green' : undefined}
            >
              {copied ? 'Copiée !' : 'Copier le courrier'}
            </Button>
          )}
          <Button onClick={onClose}>Fermer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
