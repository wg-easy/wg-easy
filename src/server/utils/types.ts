import type { ZodSchema } from 'zod';
import { z, ZodError } from 'zod';

const safeStringRefine = z
  .string()
  .refine(
    (v) => v !== '__proto__' && v !== 'constructor' && v !== 'prototype',
    { message: 'String is malformed' }
  );

const id = z
  .string()
  .uuid('Client ID must be a valid UUID')
  .and(safeStringRefine);

const address = z
  .string({ message: 'Address must be a valid string' })
  .and(safeStringRefine);

const name = z
  .string({ message: 'Name must be a valid string' })
  .min(1, 'Name must be at least 1 Character')
  .and(safeStringRefine);

const file = z
  .string({ message: 'File must be a valid string' })
  .and(safeStringRefine);

const password = z
  .string({ message: 'Password must be a valid string' })
  .and(safeStringRefine);

export const clientIdType = z.object({
  clientId: id,
});

export const addressType = z.object({
  address: address,
});

export const nameType = z.object({
  name: name,
});

export const fileType = z.object({
  file: file,
});

export const passwordType = z.object({
  password: password,
});

export function validateZod<T>(schema: ZodSchema<T>) {
  return async (data: unknown) => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof ZodError) {
        message = error.issues.map((v) => v.message).join('; ');
      }
      throw new Error(message);
    }
  };
}
