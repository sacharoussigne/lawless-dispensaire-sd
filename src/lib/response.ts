import type { ServerActionResponse } from '@/types/api';
import { NotFoundError } from './errors/NoFoundError';
import { ForbiddenError } from './errors/ForbiddenError';
import { NextResponse } from 'next/server';

/**
 * Checks if a Server Action response is successful
 */
export function isSuccessResponse<T>(
  response: ServerActionResponse<T>
): response is { status: 200; data: T } {
  return response.status === 200 && 'data' in response;
}

/**
 * Checks if a Server Action response is an error
 */
export function isErrorResponse(
  response: ServerActionResponse<unknown>
): response is Exclude<ServerActionResponse<unknown>, { status: 200; data: unknown }> {
  return response.status >= 400;
}

/**
 * Throws an error if the Server Action response is an error
 * Used in Server Components to handle errors
 */
export function throwIfError<T>(response: ServerActionResponse<T>, defaultMessage?: string): asserts response is { status: 200; data: T } {
  if (isErrorResponse(response)) {
    const errorMessage = typeof response.error === 'string' 
      ? response.error 
      : defaultMessage || 'Une erreur est survenue';
    
    // Use appropriate error classes for better error handling
    if (response.status === 404) {
      throw new NotFoundError(errorMessage);
    } else if (response.status === 403) {
      throw new ForbiddenError(errorMessage);
    } else if (response.status === 401) {
      const error = new Error(errorMessage);
      error.name = 'UnauthorizedError';
      throw error;
    }
    
    // For other errors, throw a standard Error
    throw new Error(errorMessage);
  }
}

/**
 * Extracts data from a Server Action response or throws an error
 * Used in Server Components to simplify error handling
 */
export function getDataOrThrow<T>(
  response: ServerActionResponse<T> | { status: number; data?: T; error?: string | Array<{ field: string | number; message: string }> },
  defaultMessage?: string
): T {
  // Type guard to check if it's an error
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
 * Returns a NextResponse for a 401 (Unauthorized) error
 * Used in middlewares
 */
export function unauthorizedResponse(data: { error: string }): NextResponse {
  return NextResponse.json(data, { status: 401 });
}

/**
 * Returns a NextResponse for a 403 (Forbidden) error
 * Used in middlewares
 */
export function forbiddenResponse(data: { error: string }): NextResponse {
  return NextResponse.json(data, { status: 403 });
}
