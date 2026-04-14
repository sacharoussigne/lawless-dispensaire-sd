import { z } from 'zod/v3';

export const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

export const updateBankAccountSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long'),
});

export const deleteBankAccountSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export const createBankAccountAccessSchema = z.object({
  accountId: z.string().uuid('ID de compte invalide'),
  userId: z.string().min(1, 'ID d\'utilisateur requis'),
  accessType: z.enum(['READ', 'WRITE']),
});

export const deleteBankAccountAccessSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export const createTransactionSchema = z.object({
  weekId: z.string().uuid('ID de semaine invalide'),
  date: z.string().or(z.date()),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']),
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  amount: z.number().positive('Le montant doit être positif'),
  order: z.number().int().default(0),
});

export const updateTransactionSchema = z.object({
  id: z.string().uuid('ID invalide'),
  date: z.string().or(z.date()).optional(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
  name: z.string().min(1, 'Le nom est requis').optional(),
  description: z.string().optional(),
  amount: z.number().positive('Le montant doit être positif').optional(),
  order: z.number().int().optional(),
});

export const deleteTransactionSchema = z.object({
  id: z.string().uuid('ID invalide'),
});
