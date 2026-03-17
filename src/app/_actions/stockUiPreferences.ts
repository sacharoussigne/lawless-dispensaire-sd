'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { actionErrorParser } from '@/lib/action';
import type { StockUiPreferences } from '@/types/stockUiPreferences';
import { STOCK_UI_DEFAULTS } from '@/types/stockUiPreferences';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format attendu: #RRGGBB)');

const nullableHexColor = z
  .string()
  .nullable()
  .refine((value) => value === null || /^#[0-9a-fA-F]{6}$/.test(value), 'Couleur invalide (format attendu: #RRGGBB)');

const updateMyStockUiPreferencesSchema = z.object({
  lowStockCraftableBg: hexColor,
  lowStockNormalBg: hexColor,
  okStockBg: nullableHexColor,
  unknownStockBg: nullableHexColor,
  doneTodayBadgeBg: nullableHexColor,
});

export async function getMyStockUiPreferences() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { status: 401, error: 'Non autorisé' as const };
    }

    const prefs = await prisma.userUiPreferences.findUnique({
      where: { userId: session.user.id },
      select: {
        lowStockCraftableBg: true,
        lowStockNormalBg: true,
        okStockBg: true,
        unknownStockBg: true,
        doneTodayBadgeBg: true,
      },
    });

    const resolved: StockUiPreferences = {
      lowStockCraftableBg: prefs?.lowStockCraftableBg ?? STOCK_UI_DEFAULTS.lowStockCraftableBg,
      lowStockNormalBg: prefs?.lowStockNormalBg ?? STOCK_UI_DEFAULTS.lowStockNormalBg,
      okStockBg: prefs?.okStockBg ?? null,
      unknownStockBg: prefs?.unknownStockBg ?? null,
      doneTodayBadgeBg: prefs?.doneTodayBadgeBg ?? null,
    };

    return { status: 200, data: resolved };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des préférences de stock');
  }
}

export async function updateMyStockUiPreferences(input: z.infer<typeof updateMyStockUiPreferencesSchema>) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { status: 401, error: 'Non autorisé' as const };
    }

    const validated = updateMyStockUiPreferencesSchema.parse(input);

    const result = await prisma.userUiPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        lowStockCraftableBg: validated.lowStockCraftableBg,
        lowStockNormalBg: validated.lowStockNormalBg,
        okStockBg: validated.okStockBg,
        unknownStockBg: validated.unknownStockBg,
        doneTodayBadgeBg: validated.doneTodayBadgeBg,
      },
      update: {
        lowStockCraftableBg: validated.lowStockCraftableBg,
        lowStockNormalBg: validated.lowStockNormalBg,
        okStockBg: validated.okStockBg,
        unknownStockBg: validated.unknownStockBg,
        doneTodayBadgeBg: validated.doneTodayBadgeBg,
      },
      select: {
        lowStockCraftableBg: true,
        lowStockNormalBg: true,
        okStockBg: true,
        unknownStockBg: true,
        doneTodayBadgeBg: true,
      },
    });

    const resolved: StockUiPreferences = {
      lowStockCraftableBg: result.lowStockCraftableBg,
      lowStockNormalBg: result.lowStockNormalBg,
      okStockBg: result.okStockBg,
      unknownStockBg: result.unknownStockBg,
      doneTodayBadgeBg: result.doneTodayBadgeBg,
    };

    return { status: 200, data: resolved };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la sauvegarde des préférences de stock');
  }
}

