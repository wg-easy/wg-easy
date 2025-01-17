import type { ZodSchema } from 'zod';
import z from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';

export const objectMessage = 'zod.body';

export const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: 'zod.stringMalformed' }
  );

// TODO: create custom getValidatedRouterParams and readValidatedBody wrapper

export function validateZod<T>(
  schema: ZodSchema<T>,
  event?: H3Event<EventHandlerRequest>
) {
  return async (data: unknown) => {
    let t: null | ((key: string) => string) = null;

    if (event) {
      t = await useTranslation(event);
    }

    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof z.ZodError) {
        message = error.issues
          .map((v) => {
            let m = v.message;

            if (t) {
              m = t(m);
            }

            return m;
          })
          .join('; ');
      }
      throw new Error(message);
    }
  };
}
