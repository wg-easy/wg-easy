import type { H3Event, InferEventInput } from 'h3';

export async function readValidatedFormData<
  Event extends H3Event = H3Event,
  T = InferEventInput<'body', Event, null>,
>(event: Event, validate: (data: FormData) => T) {
  const _form = await readFormData(event);
  return validateData(_form, validate);
}

async function validateData<T, K>(data: T, fn: (data: T) => K) {
  try {
    const res = await fn(data);
    if (res === false) {
      throw createValidationError();
    }
    return res;
  } catch (error) {
    throw createValidationError(error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createValidationError(validateError?: any) {
  throw createError({
    status: 400,
    statusMessage: 'Validation Error',
    message: validateError?.message || 'Validation Error',
    data: validateError,
  });
}
