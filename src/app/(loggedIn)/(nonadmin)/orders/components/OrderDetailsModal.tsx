'use client';

import { Modal, Stack, Group, Text, Badge, Divider, Table } from '@mantine/core';
import {
  getOrderStatusLabel,
  getOrderStatusColor,
} from '@/types/enum/orderStatus';
import {
  getOrderTypeLabel,
  getOrderTypeColor,
} from '@/types/enum/orderType';
import type { OrderWithRelations } from '@/types/orders';

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
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Détails de la commande"
      size="lg"
    >
      {viewingOrder && (
        <Stack gap="md">
          <Group>
            <Text fw={500}>Nom :</Text>
            <Text>{viewingOrder.name}</Text>
          </Group>
          <Group>
            <Text fw={500}>Entreprise :</Text>
            <Text>{viewingOrder.company.name}</Text>
          </Group>
          <Group>
            <Text fw={500}>Statut :</Text>
            <Badge color={getOrderStatusColor(viewingOrder.status)}>
              {getOrderStatusLabel(viewingOrder.status)}
            </Badge>
          </Group>
          <Group>
            <Text fw={500}>Type :</Text>
            <Badge color={getOrderTypeColor(viewingOrder.type || 'INCOMING')}>
              {getOrderTypeLabel(viewingOrder.type || 'INCOMING')}
            </Badge>
          </Group>
          {viewingOrder.price != null && (
            <Group>
              <Text fw={500}>Prix :</Text>
              <Text>{viewingOrder.price.toFixed(2)} $</Text>
            </Group>
          )}
          {viewingOrder.details && (
            <Group>
              <Text fw={500}>Détails :</Text>
              <Text>{viewingOrder.details}</Text>
            </Group>
          )}
          <Group>
            <Text fw={500}>Date de création :</Text>
            <Text>
              {new Date(viewingOrder.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Group>
          <Divider />
          <Text fw={500}>Objets :</Text>
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
      )}
    </Modal>
  );
}

