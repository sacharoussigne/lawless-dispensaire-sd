export type StockUiPreferences = {
  lowStockCraftableBg: string;
  lowStockNormalBg: string;
  okStockBg: string | null;
  unknownStockBg: string | null;
  doneTodayBadgeBg: string | null;
};

export const STOCK_UI_DEFAULTS: StockUiPreferences = {
  lowStockCraftableBg: '#faf2d7',
  lowStockNormalBg: '#f5e4e5',
  okStockBg: null,
  unknownStockBg: null,
  doneTodayBadgeBg: null,
};