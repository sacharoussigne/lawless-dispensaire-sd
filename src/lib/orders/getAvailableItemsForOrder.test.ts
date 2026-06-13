import { describe, expect, it } from 'vitest';
import { OrderTypeEnum } from '@/types/enum/orderType';
import type { ItemWithRelations } from '@/types/stock';
import { getAvailableItemsForOrder } from './getAvailableItemsForOrder';

const baseItem = {
  stockToday: null,
  stockYesterday: null,
} as ItemWithRelations;

describe('getAvailableItemsForOrder', () => {
  it('filters incoming items by company group', () => {
    const items: ItemWithRelations[] = [
      { ...baseItem, id: '1', name: 'A', isCraftable: false, companyGroupId: 'g1', canBeSold: false, price: 10 },
      { ...baseItem, id: '2', name: 'B', isCraftable: true, companyGroupId: 'g1', canBeSold: false, price: 10 },
      { ...baseItem, id: '3', name: 'C', isCraftable: false, companyGroupId: 'g2', canBeSold: false, price: 10 },
    ];

    const result = getAvailableItemsForOrder({
      orderType: OrderTypeEnum.INCOMING,
      allItems: items,
      companyGroupId: 'g1',
    });

    expect(result.map((item) => item.id)).toEqual(['1']);
  });

  it('allows sellable outgoing items', () => {
    const items: ItemWithRelations[] = [
      { ...baseItem, id: '1', name: 'A', isCraftable: true, companyGroupId: 'g1', canBeSold: true, price: null },
      { ...baseItem, id: '2', name: 'B', isCraftable: false, companyGroupId: 'g1', canBeSold: false, price: 5 },
    ];

    const result = getAvailableItemsForOrder({
      orderType: OrderTypeEnum.OUTGOING,
      allItems: items,
    });

    expect(result.map((item) => item.id)).toEqual(['1', '2']);
  });
});
