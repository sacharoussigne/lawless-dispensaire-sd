import { OrderTypeEnum } from '@/types/enum/orderType';
import type { ItemWithRelations } from '@/types/stock';
import { normalizeItemPrice } from './calculateOrderPriceFromItems';

export function getAvailableItemsForOrder(params: {
  orderType: OrderTypeEnum;
  allItems: ItemWithRelations[];
  companyGroupId?: string | null;
  firstOrderItemId?: string | null;
}): ItemWithRelations[] {
  const { orderType, allItems, companyGroupId, firstOrderItemId } = params;

  if (orderType === OrderTypeEnum.OUTGOING) {
    return allItems.filter((item) => {
      const hasCanBeSold = item.canBeSold === true;
      const price = normalizeItemPrice(item.price);
      const hasPrice = price != null && price > 0;
      const isNotCraftableWithPrice = !item.isCraftable && hasPrice;
      return hasCanBeSold || isNotCraftableWithPrice;
    });
  }

  let groupId = companyGroupId;
  if (!groupId && firstOrderItemId) {
    const firstItem = allItems.find((item) => item.id === firstOrderItemId);
    groupId = firstItem?.companyGroupId ?? null;
  }

  if (!groupId) {
    return [];
  }

  return allItems.filter(
    (item) => !item.isCraftable && item.companyGroupId === groupId,
  );
}
