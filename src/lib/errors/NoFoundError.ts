import { ErrorWithStatus } from './ErrorWithStatus';

export class NotFoundError extends ErrorWithStatus {
  constructor(message: string) {
    super(message, 404);
  }
}
