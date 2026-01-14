export class ValidationError<T = string> extends Error {
    constructor(public data: T, public statusCode = 422) {
        super();
    }
}