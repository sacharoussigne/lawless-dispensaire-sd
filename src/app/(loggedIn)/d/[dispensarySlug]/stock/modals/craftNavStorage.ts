export type CraftContextV1 = {
  craftedItemId: string | null;
  recipeId: string | null;
  times: number;
  sourceChestId: string | null;
  destinationChestId: string | null;
  ingredientChests: Record<string, string>;
};

const NAV_STACK_KEY_V1 = 'craft.navStack.v1';
const LAST_RECIPE_BY_ITEM_KEY_V1 = 'craft.lastRecipeByItem.v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadCraftNavStack(): CraftContextV1[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(NAV_STACK_KEY_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CraftContextV1[];
  } catch {
    return [];
  }
}

function saveCraftNavStack(stack: CraftContextV1[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(NAV_STACK_KEY_V1, JSON.stringify(stack));
  } catch {
    // Intentionally ignore storage failures (quota, privacy mode, etc.)
  }
}

export function pushCraftNavStack(ctx: CraftContextV1): CraftContextV1[] {
  const stack = loadCraftNavStack();
  const next = [...stack, ctx];
  saveCraftNavStack(next);
  return next;
}

export function popCraftNavStack(): { stack: CraftContextV1[]; popped: CraftContextV1 | null } {
  const stack = loadCraftNavStack();
  if (stack.length === 0) {
    return { stack, popped: null };
  }
  const popped = stack[stack.length - 1] ?? null;
  const next = stack.slice(0, -1);
  saveCraftNavStack(next);
  return { stack: next, popped };
}

export function clearCraftNavStack(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(NAV_STACK_KEY_V1);
  } catch {
    // Intentionally ignore
  }
}

function loadLastRecipeByItem(): Record<string, string> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(LAST_RECIPE_BY_ITEM_KEY_V1);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function getLastRecipeIdForItem(itemId: string): string | null {
  const map = loadLastRecipeByItem();
  return map[itemId] ?? null;
}

export function setLastRecipeIdForItem(itemId: string, recipeId: string): void {
  if (!isBrowser()) return;
  try {
    const map = loadLastRecipeByItem();
    const next = { ...map, [itemId]: recipeId };
    window.localStorage.setItem(LAST_RECIPE_BY_ITEM_KEY_V1, JSON.stringify(next));
  } catch {
    // Intentionally ignore
  }
}

