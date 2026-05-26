import { ZodType, ZodError } from "zod";
import {
  FieldError,
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverResult,
} from "react-hook-form";

const zodToHookFormErrors = <T extends FieldValues>(
  zodError: ZodError
): FieldErrors<T> => {
  const errors: Record<string, FieldError> = {};
  for (const issue of zodError.issues) {
    const path = issue.path.join(".") || "root";
    errors[path] = {
      type: issue.code,
      message: issue.message,
    };
  }
  return errors as FieldErrors<T>;
};

export const customResolver = <T extends FieldValues>(
  schema: ZodType<T>
): Resolver<T> => {
  return async (values: T): Promise<ResolverResult<T>> => {
    try {
      const result = await schema.safeParseAsync(values);
      if (result.success) {
        return { values: result.data, errors: {} };
      } else {
        return { values: {}, errors: zodToHookFormErrors<T>(result.error) };
      }
    } catch (error) {
      return {
        values: {},
        errors: {
          root: {
            type: "unknown",
            message: "An unknown error occurred during validation",
          } as FieldError,
        } as FieldErrors<T>,
      };
    }
  };
};
