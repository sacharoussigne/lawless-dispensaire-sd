# Data fetching client — React Query + Server Actions

Ce guide décrit le standard du projet pour charger et muter des données serveur côté client.

## Stack

- **Next.js App Router** — pages Server Components pour le chargement initial
- **Server actions** (`'use server'`) — source de vérité serveur (pas de routes API REST internes)
- **@tanstack/react-query v5** — cache, déduplication, invalidation côté client

## Setup

Le `QueryProvider` est monté dans le layout dispensary :

- [`src/lib/react-query/QueryProvider.tsx`](../src/lib/react-query/QueryProvider.tsx)
- [`src/app/(loggedIn)/d/[dispensarySlug]/layout.tsx`](../src/app/(loggedIn)/d/[dispensarySlug]/layout.tsx)

Valeurs par défaut : `staleTime: 30s`, `refetchOnWindowFocus: false`.

## Pattern lecture (SSR + client)

### Server Component

```tsx
const [itemsResult, checksResult] = await Promise.all([
  getItemsWithStock(dispensarySlug),
  getStockChecksSummary(dispensarySlug),
]);
const items = getDataOrThrow(itemsResult, '...');
const checks = getDataOrThrow(checksResult, '...');

return <StockPageClient initialItems={items} initialStockChecksSummary={checks} />;
```

### Client — hook query

Référence : [`src/app/(loggedIn)/d/[dispensarySlug]/stock/hooks/useStockQueries.ts`](../src/app/(loggedIn)/d/[dispensarySlug]/stock/hooks/useStockQueries.ts)

```tsx
export function useStockItems(chestId: string | null, initialData: ItemWithRelations[]) {
  const { dispensarySlug } = usePermissions();

  return useQuery({
    queryKey: stockKeys.items(dispensarySlug!, chestId),
    queryFn: () => fetchStockItems(dispensarySlug!, chestId),
    initialData: chestId === null ? initialData : undefined,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}
```

Points clés :

- Passer `initialData` depuis le SSR quand la clé correspond au premier rendu (`chestId === null`)
- Ne **pas** ajouter un `useEffect` + `loadItems()` en parallèle du SSR
- Inclure `dispensarySlug` dans les query keys (multi-tenant)

## Pattern mutation

```tsx
export function useUpdateStockMutation() {
  const invalidateStock = useInvalidateStockItems();

  return useMutation({
    mutationFn: async (vars) => {
      const result = await updateStock(dispensarySlug!, vars.stockData, vars.targetChestId, ...);
      handleAction(result);
      return vars;
    },
    onSuccess: (vars) => {
      invalidateStock([null, vars.targetChestId]);
      notifications.show({ title: 'Succès', color: 'moss', ... });
    },
    onError: (error) => {
      notifications.show({ title: 'Erreur', color: 'danger', ... });
    },
  });
}
```

- Notifications dans le hook mutation, pas dans la page
- Invalidation **ciblée** des coffres touchés
- Pas de `await loadItems()` manuel après mutation

## Organisation des fichiers

| Emplacement | Rôle |
|---|---|
| `src/lib/react-query/QueryProvider.tsx` | Provider global |
| `src/lib/<feature>/queryKeys.ts` | Clés hiérarchiques partagées |
| `src/app/.../<feature>/hooks/useXxx.ts` | Hooks query/mutation par feature |

Convention des clés :

```ts
export const stockKeys = {
  all: (slug: string) => ['stock', slug] as const,
  items: (slug: string, chestId: string | null) =>
    [...stockKeys.all(slug), 'items', chestId] as const,
};
```

## Anti-patterns interdits

### Double fetch SSR + useEffect

```tsx
// ❌
useEffect(() => { loadItems(); }, [chestId]);

// ✅
const { data: items } = useStockItems(chestId, initialItems);
```

### Cache manuel ad hoc

```tsx
// ❌ cacheRef dans une modale
// ✅ useStockItems / useQueries avec les mêmes query keys
```

### Envoyer tous les items en mutation alors que seuls quelques-uns changent

```tsx
// ❌ items.map(...) → updateStock(all)
// ✅ getChangedStockEntries(items, editedQuantities)
```

## Migration legacy

Le pattern `useState` + `useEffect` + `loadX()` (ex. agenda) est **legacy**. Lors d'une refonte de feature, migrer vers React Query. Ne pas migrer massivement hors scope.

`runAsyncEffect` reste valide pour les subscriptions temps réel ou effets ponctuels sans cache (ex. [`AgendaRealtimeProvider`](../src/lib/agenda/realtime/AgendaRealtimeProvider.tsx)).

## Implémentation de référence

Module **stock** :

- [`useStockQueries.ts`](../src/app/(loggedIn)/d/[dispensarySlug]/stock/hooks/useStockQueries.ts)
- [`StockPageClient.tsx`](../src/app/(loggedIn)/d/[dispensarySlug]/stock/StockPageClient.tsx)
- [`queryKeys.ts`](../src/lib/stock/queryKeys.ts)
