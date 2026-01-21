import type { ServerActionResponse } from '@/types/api';
import { NotFoundError } from './errors/NoFoundError';
import { ForbiddenError } from './errors/ForbiddenError';
import { NextResponse } from 'next/server';

/**
 * Vérifie si une réponse de Server Action est réussie
 */
export function isSuccessResponse<T>(
  response: ServerActionResponse<T>
): response is { status: 200; data: T } {
  return response.status === 200 && 'data' in response;
}

/**
 * Vérifie si une réponse de Server Action est une erreur
 */
export function isErrorResponse(
  response: ServerActionResponse<unknown>
): response is Exclude<ServerActionResponse<unknown>, { status: 200; data: unknown }> {
  return response.status >= 400;
}

/**
 * Lance une erreur si la réponse de Server Action est une erreur
 * Utilisé dans les Server Components pour gérer les erreurs
 */
export function throwIfError<T>(response: ServerActionResponse<T>, defaultMessage?: string): asserts response is { status: 200; data: T } {
  if (isErrorResponse(response)) {
    const errorMessage = typeof response.error === 'string' 
      ? response.error 
      : defaultMessage || 'Une erreur est survenue';
    
    // Utiliser les classes d'erreur appropriées pour une meilleure gestion
    if (response.status === 404) {
      throw new NotFoundError(errorMessage);
    } else if (response.status === 403) {
      throw new ForbiddenError(errorMessage);
    } else if (response.status === 401) {
      const error = new Error(errorMessage);
      error.name = 'UnauthorizedError';
      throw error;
    }
    
    // Pour les autres erreurs, lancer une Error standard
    throw new Error(errorMessage);
  }
}

/**
 * Extrait les données d'une réponse de Server Action ou lance une erreur
 * Utilisé dans les Server Components pour simplifier la gestion d'erreurs
 */
export function getDataOrThrow<T>(
  response: ServerActionResponse<T> | { status: number; data?: T; error?: string | Array<{ field: string | number; message: string }> },
  defaultMessage?: string
): T {
  // Type guard pour vérifier si c'est une erreur
  if (response.status >= 400) {
    const errorResponse = response as { status: number; error?: string | Array<{ field: string | number; message: string }> };
    const errorMessage = typeof errorResponse.error === 'string' 
      ? errorResponse.error 
      : defaultMessage || 'Une erreur est survenue';
    
    if (response.status === 404) {
      throw new NotFoundError(errorMessage);
    } else if (response.status === 403) {
      throw new ForbiddenError(errorMessage);
    } else if (response.status === 401) {
      const error = new Error(errorMessage);
      error.name = 'UnauthorizedError';
      throw error;
    }
    
    throw new Error(errorMessage);
  }
  
  if (!('data' in response) || !response.data) {
    throw new Error(defaultMessage || 'Aucune donnée disponible');
  }
  
  return response.data;
}

/**
 * Retourne une réponse NextResponse pour une erreur 401 (Non autorisé)
 * Utilisé dans les middlewares
 */
export function unauthorizedResponse(data: { error: string }): NextResponse {
  return NextResponse.json(data, { status: 401 });
}

/**
 * Retourne une réponse NextResponse pour une erreur 403 (Interdit)
 * Utilisé dans les middlewares
 */
export function forbiddenResponse(data: { error: string }): NextResponse {
  return NextResponse.json(data, { status: 403 });
}
