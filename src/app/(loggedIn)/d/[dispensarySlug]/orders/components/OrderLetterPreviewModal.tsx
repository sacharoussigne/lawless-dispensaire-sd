'use client';

import { useEffect, useState } from 'react';
import { Stack, Text, Button, Loader, Paper } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { generateOrderMailPreview } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import { useOrderDetail } from '../hooks/useOrdersQueries';

interface OrderLetterPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  orderId: string | null;
}

export function OrderLetterPreviewModal({
  opened,
  onClose,
  orderId,
}: OrderLetterPreviewModalProps) {
  const dispensarySlug = useRequiredDispensarySlug();
  const { data: order, isLoading: loadingOrder } = useOrderDetail(
    orderId,
    opened && Boolean(orderId),
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (opened && order) {
      void loadPreview(order);
    } else {
      setPreview(null);
    }
  }, [opened, order]);

  const loadPreview = async (orderData: NonNullable<typeof order>) => {
    try {
      setLoading(true);
      const result = await generateOrderMailPreview(dispensarySlug, {
        order: {
          type: orderData.type,
          status: orderData.status,
          price: orderData.price,
          company: orderData.company,
          individualCustomer: orderData.individualCustomer,
          items: orderData.items.map((orderItem) => ({
            quantity: orderItem.quantity,
            item: { name: orderItem.item.name },
          })),
        },
      });
      const data = handleAction(result);
      if (data) {
        setPreview(data.preview);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erreur lors du chargement de l\'aperçu';
      notifications.show({
        title: 'Erreur',
        message,
        color: 'danger',
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
        color: 'moss',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de copier le courrier',
        color: 'danger',
      });
    }
  };

  const isLoading = loadingOrder || loading;

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Aperçu du courrier"
      size="lg"
      footer={
        preview ? (
          <AppModalFooter>
            <Button
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              onClick={handleCopy}
              color={copied ? 'moss' : 'sage'}
            >
              {copied ? 'Copié !' : 'Copier le courrier'}
            </Button>
          </AppModalFooter>
        ) : undefined
      }
    >
      {isLoading ? (
        <Stack align="center" py="xl">
          <Loader />
          <Text size="sm" c="dimmed">
            Génération de l&apos;aperçu...
          </Text>
        </Stack>
      ) : preview ? (
        <Paper p="md" withBorder>
          <Text
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--disp-font-ui)',
            }}
          >
            {preview}
          </Text>
        </Paper>
      ) : (
        <Text c="dimmed" ta="center">
          Aucun aperçu disponible
        </Text>
      )}
    </AppModal>
  );
}
