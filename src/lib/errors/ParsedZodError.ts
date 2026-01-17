import { ErrorWithStatus } from "./ErrorWithStatus";

export class ParsedZodError extends ErrorWithStatus {
    constructor(public error: {
        field: string | number;
        message: string;
    }[]) {
        super("ParsedZodError", 422);
    }

    toFormError() {
        const error: {[key: string]: string} = {};
        for(const e of this.error) {
            error[e.field] = e.message;
        }

        return error;
    }
}