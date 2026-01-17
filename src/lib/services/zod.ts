import {UseFormReturnType} from "@mantine/form";
import {ZodError} from "zod";

export function handleApiZodError<T>(
    errors: { field: string | number; message: string }[],
    form: UseFormReturnType<T>,
) {
    errors.forEach((error) => {
        const { field, message } = error;

        form.setFieldError(`${field}`, message);
    });
}

export const zodErrorParser = (zodError: ZodError) => {
    const errors: { field: string | number; message: string }[] = [];

    for (const error of zodError.errors) {
        errors.push({ field: error.path[0] ?? "unknown", message: error.message });
    }

    return errors;
};

export const makeZodError = (errors: { input: string; message: string }[]) => {
    const zodErrors: { code: "custom"; path: string[]; message: string }[] = [];

    for (const error of errors) {
        zodErrors.push({
            code: "custom",
            path: [error.input],
            message: error.message,
        });
    }

    return new ZodError(zodErrors);
};
