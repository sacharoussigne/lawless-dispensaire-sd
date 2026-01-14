import { ErrorWithStatus } from "./ErrorWithStatus";


export class ForbiddenError extends ErrorWithStatus {
    constructor(message: string) {
        super(message, 403);
    }
}