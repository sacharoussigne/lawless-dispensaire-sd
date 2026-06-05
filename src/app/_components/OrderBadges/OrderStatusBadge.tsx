import { Badge } from '@mantine/core';
import type { OrderStatus } from '@prisma/client';
import { getOrderStatusLabel, getOrderStatusPillStyle } from '@/types/enum/orderStatus';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" radius="sm" style={getOrderStatusPillStyle(status)}>
      {getOrderStatusLabel(status)}
    </Badge>
  );
}
