export type StockUiPreferences = {
  lowStockCraftableBg: string;
  lowStockNormalBg: string;
  okStockBg: string | null;
  unknownStockBg: string | null;
  doneTodayBadgeBg: string | null;
};

export const STOCK_UI_DEFAULTS: StockUiPreferences = {
  lowStockCraftableBg: '#fff3cd',
  lowStockNormalBg: '#f8d7da',
  okStockBg: null,
  unknownStockBg: null,
  doneTodayBadgeBg: null,
};

