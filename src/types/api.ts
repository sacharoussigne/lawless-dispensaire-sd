/**
 * Type pour les réponses des Server Actions
 */
export type ServerActionResponse<T> =
  | { status: 200; data: T }
  | { status: 400; error: string }
  | { status: 401; error: string }
  | { status: 403; error: string }
  | { status: 404; error: string }
  | { status: 422; error: Array<{ field: string | number; message: string }> | string }
  | { status: 500; error: string };
