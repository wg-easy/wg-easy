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
      // eslint-disable-next-line preserve-caught-error
      throw new Error(message);
    }
  };
}
