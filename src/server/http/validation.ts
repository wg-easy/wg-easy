import { createError, getRouterParams, type RequestEvent } from 'nuxt/server';
import z, { type ZodType } from 'zod';

import { useRequestTranslation } from '#server/http/translation';

export function validateZod<T>(schema: ZodType<T>, event: RequestEvent) {
  return async (data: unknown) => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof z.ZodError) {
        const t = await useRequestTranslation(event);

        message = error.issues
          .map((v) => {
            let m = v.message;

            if (t) {
              let newMessage = null;
              if (v.message.startsWith('validation.')) {
                switch (v.code) {
                  case 'too_small':
                    switch (v.origin) {
                      case 'string':
                        newMessage = t('validation.messages.stringMin', {
                          field: t(v.message),
                          min: v.minimum,
                        });
                        break;
                      case 'number':
                        newMessage = t('validation.messages.numberMin', {
                          field: t(v.message),
                          min: v.minimum,
                        });
                        break;
                    }
                    break;
                  case 'too_big':
                    switch (v.origin) {
                      case 'string':
                        newMessage = t('validation.messages.stringMax', {
                          field: t(v.message),
                          max: v.maximum,
                        });
                        break;
                      case 'number':
                        newMessage = t('validation.messages.numberMax', {
                          field: t(v.message),
                          max: v.maximum,
                        });
                        break;
                    }
                    break;
                  case 'invalid_type': {
                    if (v.input === null || v.input === undefined) {
                      newMessage = t('validation.messages.required', {
                        field: v.path.join('.'),
                      });
                    } else {
                      switch (v.expected) {
                        case 'string':
                          newMessage = t('validation.messages.validString', {
                            field: t(v.message),
                          });
                          break;
                        case 'boolean':
                          newMessage = t('validation.messages.validBoolean', {
                            field: t(v.message),
                          });
                          break;
                        case 'number':
                          newMessage = t('validation.messages.validNumber', {
                            field: t(v.message),
                          });
                          break;
                        case 'array':
                          newMessage = t('validation.messages.validArray', {
                            field: t(v.message),
                          });
                          break;
                      }
                    }
                    break;
                  }
                }
              }
              if (
                !newMessage &&
                v.message === 'validation.messages.validNumberRange'
              ) {
                newMessage = t(v.message, { field: v.path.join('.') });
              }
              if (newMessage) {
                m = newMessage;
              } else {
                m = t(v.message);
              }
            }

            return m;
          })
          .join('; ');
      }
      throw createError({
        status: 400,
        statusText: 'Validation Error',
        message,
        cause: error,
      });
    }
  };
}

export async function getValidatedRouterParams<T>(
  event: RequestEvent,
  validate: (data: unknown) => Promise<T>
) {
  let params: ReturnType<typeof getRouterParams>;
  try {
    // Decode ordinary escapes (e.g. %31 -> 1), as Nitro 2 did for IDs/tokens.
    // Nuxt preserves encoded path separators; schemas validate the result.
    params = getRouterParams(event, { decode: true });
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    throw createError({
      status: 400,
      statusText: 'Validation Error',
      message: 'Malformed route parameter encoding',
      cause: error,
    });
  }
  return validate(params);
}
