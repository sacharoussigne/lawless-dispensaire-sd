'use client';

import { useMemo } from 'react';
import { Modal, Stack, Group, Text, Divider, Table, SimpleGrid } from '@mantine/core';
import { calculateOrderWeightFromItems } from '@/lib/orders/calculateOrderWeightFromItems';
import { OrderStatusBadge } from '@/app/_components/OrderBadges/OrderStatusBadge';
import { OrderTypeBadge } from '@/app/_components/OrderBadges/OrderTypeBadge';
import { getOrderClientDisplayName, type OrderWithRelations } from '@/types/orders';

interface OrderDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  viewingOrder: OrderWithRelations | null;
}

export function OrderDetailsModal({
  opened,
  onClose,
  viewingOrder,
}: OrderDetailsModalProps) {
  const totalWeight = useMemo(
    () =>
      viewingOrder
        ? calculateOrderWeightFromItems(
            viewingOrder.items.map((orderItem) => ({
              quantity: orderItem.quantity,
              weight: orderItem.item.weight,
            }))
          )
        : null,
    [viewingOrder]
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Détails de la commande"
      size="lg"
    >
      {viewingOrder && (
        <Stack gap="lg">
          <Stack gap="sm">
            <Text fw={600} size="xs" c="dimmed" tt="uppercase">
              Informations générales
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Nom
                </Text>
                <Text fw={500}>{viewingOrder.name}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Client
                </Text>
                <Text fw={500}>{getOrderClientDisplayName(viewingOrder)}</Text>
              </Stack>
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Statut
                </Text>
                <OrderStatusBadge status={viewingOrder.status} />
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Type
                </Text>
                <OrderTypeBadge type={viewingOrder.type || 'INCOMING'} />
              </Stack>
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {viewingOrder.price != null && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Prix total
                  </Text>
                  <Text fw={500}>{viewingOrder.price.toFixed(2)} $</Text>
                </Stack>
              )}
              {totalWeight != null && (
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Poids total
                  </Text>
                  <Text fw={500}>{totalWeight.toFixed(2)} kg</Text>
                </Stack>
              )}
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Date de création
                </Text>
                <Text>
                  {new Date(viewingOrder.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Stack>
            </SimpleGrid>
            {viewingOrder.details && (
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Détails
                </Text>
                <Text>{viewingOrder.details}</Text>
              </Stack>
            )}
          </Stack>

          <Divider />

          <Stack gap="md">
            <Text fw={600} size="xs" c="dimmed" tt="uppercase">
              Objets de la commande
            </Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Objet</Table.Th>
                  <Table.Th>Quantité</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {viewingOrder.items.map((orderItem) => (
                  <Table.Tr key={orderItem.id}>
                    <Table.Td>{orderItem.item.name}</Table.Td>
                    <Table.Td>{orderItem.quantity}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Stack>
      )}
    </Modal>
  );
}

