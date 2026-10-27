import { useTranslation } from '@intlify/h3';
import z, { type ZodType } from 'zod';
import type { H3Event, EventHandlerRequest } from 'h3';

export function validateZod<T>(
  schema: ZodType<T>,
  event: H3Event<EventHandlerRequest>
) {
  return async (data: unknown) => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      let message = 'Unexpected Error';
      if (error instanceof z.ZodError) {
        const t = await useTranslation(event);

        message = error.issues
          .map((v) => {
            let m = v.message;

            if (t) {
              let newMessage = null;
              if (v.message.startsWith('zod.')) {
                switch (v.code) {
                  case 'too_small':
                    switch (v.origin) {
                      case 'string':
                        newMessage = t('zod.generic.stringMin', {
                          field: t(v.message),
                          min: v.minimum,
                        });
                        break;
                      case 'number':
                        newMessage = t('zod.generic.numberMin', {
                          field: t(v.message),
                          min: v.minimum,
                        });
                        break;
                    }
                    break;
                  case 'too_big':
                    switch (v.origin) {
                      case 'string':
                        newMessage = t('zod.generic.stringMax', {
                          field: t(v.message),
                          max: v.maximum,
                        });
                        break;
                      case 'number':
                        newMessage = t('zod.generic.numberMax', {
                          field: t(v.message),
                          max: v.maximum,
                        });
                        break;
                    }
                    break;
                  case 'invalid_type': {
                    if (v.input === null || v.input === undefined) {
                      newMessage = t('zod.generic.required', {
                        field: v.path.join('.'),
                      });
                    } else {
                      switch (v.expected) {
                        case 'string':
                          newMessage = t('zod.generic.validString', {
                            field: t(v.message),
                          });
                          break;
                        case 'boolean':
                          newMessage = t('zod.generic.validBoolean', {
                            field: t(v.message),
                          });
                          break;
                        case 'number':
                          newMessage = t('zod.generic.validNumber', {
                            field: t(v.message),
                          });
                          break;
                        case 'array':
                          newMessage = t('zod.generic.validArray', {
                            field: t(v.message),
                          });
                          break;
                      }
                    }
                    break;
                  }
                }
              }
              if (!newMessage && v.message === 'zod.generic.validNumberRange') {
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
      // eslint-disable-next-line preserve-caught-error
      throw new Error(message);
    }
  };
}
