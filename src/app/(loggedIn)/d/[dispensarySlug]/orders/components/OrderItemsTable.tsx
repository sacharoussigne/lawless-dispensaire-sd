'use client';

import {
  Table,
  NumberInput,
  ActionIcon,
  Text,
  Select,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { OrderItem } from '@/types/orders';

interface OrderItemsTableProps {
  orderItems: OrderItem[];
  disabled?: boolean;
  loadingItems?: boolean;
  availableItemOptions: { value: string; label: string }[];
  onQuantityChange: (itemId: string, quantity: number | string) => void;
  onRemoveItem: (itemId: string) => void;
  onAddItem: (itemId: string) => void;
}

export function OrderItemsTable({
  orderItems,
  disabled = false,
  loadingItems = false,
  availableItemOptions,
  onQuantityChange,
  onRemoveItem,
  onAddItem,
}: OrderItemsTableProps) {
  return (
    <>
      {orderItems.length > 0 ? (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Objet</Table.Th>
              <Table.Th>Quantité</Table.Th>
              <Table.Th>Prix unitaire</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th style={{ width: 50 }} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orderItems.map((orderItem) => {
              const itemPrice = orderItem.item.price || 0;
              const itemTotal = itemPrice * orderItem.quantity;
              return (
                <Table.Tr key={orderItem.itemId}>
                  <Table.Td>{orderItem.item.name}</Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={orderItem.quantity}
                      onChange={(value) => onQuantityChange(orderItem.itemId, value)}
                      min={1}
                      style={{ maxWidth: 120 }}
                      disabled={disabled}
                    />
                  </Table.Td>
                  <Table.Td>{itemPrice > 0 ? `${itemPrice.toFixed(2)} $` : '-'}</Table.Td>
                  <Table.Td>{itemTotal > 0 ? `${itemTotal.toFixed(2)} $` : '-'}</Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="danger"
                      variant="light"
                      onClick={() => onRemoveItem(orderItem.itemId)}
                      disabled={disabled}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed" ta="center" py="md">
          Aucun objet dans la commande. Utilisez le champ ci-dessous pour ajouter un objet.
        </Text>
      )}

      {!disabled && (
        <Select
          label="Ajouter un objet"
          placeholder="Sélectionner un objet à ajouter"
          data={availableItemOptions}
          disabled={loadingItems || availableItemOptions.length === 0}
          onChange={(value) => {
            if (value) {
              onAddItem(value);
            }
          }}
          searchable
          clearable
        />
      )}
    </>
  );
}
