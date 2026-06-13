import {
  OrderStatusEnum,
  getOrderStatusLabel,
} from '@/types/enum/orderStatus';
import {
  OrderTypeEnum,
  getOrderTypeLabel,
} from '@/types/enum/orderType';

export const orderStatusSelectOptions = [
  { value: OrderStatusEnum.DRAFT, label: getOrderStatusLabel(OrderStatusEnum.DRAFT) },
  {
    value: OrderStatusEnum.LETTER_SENT,
    label: getOrderStatusLabel(OrderStatusEnum.LETTER_SENT),
  },
  {
    value: OrderStatusEnum.PROCESSING,
    label: getOrderStatusLabel(OrderStatusEnum.PROCESSING),
  },
  { value: OrderStatusEnum.READY, label: getOrderStatusLabel(OrderStatusEnum.READY) },
  {
    value: OrderStatusEnum.COMPLETED,
    label: getOrderStatusLabel(OrderStatusEnum.COMPLETED),
  },
  {
    value: OrderStatusEnum.CANCELLED,
    label: getOrderStatusLabel(OrderStatusEnum.CANCELLED),
  },
];

export const orderTypeSelectOptions = [
  { value: OrderTypeEnum.INCOMING, label: getOrderTypeLabel(OrderTypeEnum.INCOMING) },
  { value: OrderTypeEnum.OUTGOING, label: getOrderTypeLabel(OrderTypeEnum.OUTGOING) },
];

export const orderStatusFilterOptions = [
  { value: '', label: 'Tous les statuts' },
  ...orderStatusSelectOptions,
];
