export function tenantWhere(dispensaryId: string) {
  return { dispensaryId } as const;
}
