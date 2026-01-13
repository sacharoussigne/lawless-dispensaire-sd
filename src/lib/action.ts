import { ZodError } from "zod/v3";
import { ErrorWithStatus } from "./errors/ErrorWithStatus";
import { zodErrorParser } from "./services/zod";
import { NotFoundError } from "./errors/NoFoundError";
import { ParsedZodError } from "./errors/ParsedZodError";
import { ForbiddenError } from "./errors/ForbiddenError";


export function actionErrorParser(error: ErrorWithStatus | ZodError | Error | unknown, defaultMessage: string = 'Please try again.') {
    if(error instanceof ZodError) {
        return {
            status: 422,
            error: zodErrorParser(error as ZodError),
        }
    }

    if(error instanceof ErrorWithStatus) {
        return {
            status: error.statusCode,
            error: error.message,
        }
    }

    if(error instanceof Error) {
        return {
            status: 500,
            error: error.message,
        }
    }

    return {
        status: 500,
        error: defaultMessage,
    }
}

export function handleAction<T = any>(actionResponse: {
    data?: T,
    status: number;
    error?: string | {
        field: string | number;
        message: string;
    }[]
}) {
    const {data, status, error} = actionResponse
    if (status === 404) {
        throw new NotFoundError(error ? error as string : "Resource not found");
    }

    if (status === 403) {
        throw new ForbiddenError(error ? error as string : "Forbidden");
    }

    if (status === 422 && error && Array.isArray(error)) {
        throw new ParsedZodError(error as {
            field: string | number;
            message: string;
        }[])
    }
    if (status >= 400) {
        throw new Error(error ? error as string : "An error occurred, please try again later.");
    }

    return data;
}