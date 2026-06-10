export type AgendaMutationMeta = {
  originClientId?: string;
};

export function agendaMutationMeta(
  clientId: string | null | undefined,
): AgendaMutationMeta | undefined {
  if (!clientId) {
    return undefined;
  }
  return { originClientId: clientId };
}
