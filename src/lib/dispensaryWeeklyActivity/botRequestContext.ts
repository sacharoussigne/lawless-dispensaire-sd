import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  assertBotDispensaryWeeklyActivityEnabled,
  getDispensaryIdFromBotRequest,
} from '@/lib/dispensaryWeeklyActivityApiAuth';

export async function resolveBotDispensaryContext(request: NextRequest): Promise<
  | { ok: true; dispensaryId: string }
  | { ok: false; status: number; error: string }
> {
  const dispensaryId = getDispensaryIdFromBotRequest(request);
  if (!dispensaryId) {
    return { ok: false, status: 400, error: 'En-tête X-Dispensary-Id ou query dispensaryId requis' };
  }

  const exists = await prisma.dispensary.findUnique({
    where: { id: dispensaryId },
    select: { id: true },
  });
  if (!exists) {
    return { ok: false, status: 404, error: 'Dispensaire introuvable' };
  }

  const feature = await assertBotDispensaryWeeklyActivityEnabled(dispensaryId);
  if (!feature.ok) {
    return { ok: false, status: feature.status, error: feature.error };
  }

  return { ok: true, dispensaryId };
}
