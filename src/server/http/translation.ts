import type { H3Event } from 'h3';
import { useTranslation } from '@intlify/h3';
import type { RequestEvent } from 'nuxt/server';

// Nuxt shares the request context with its portable event. Retain the original
// event for @intlify/h3's locale detection.
// Do not cast RequestEvent to H3Event.
const requests = new WeakMap<object, H3Event>();

export function bindTranslationRequest(event: H3Event) {
  requests.set(event.context, event);
}

export function useRequestTranslation(event: Pick<RequestEvent, 'context'>) {
  const original = requests.get(event.context);
  if (!original) throw new Error('Translation middleware did not run');
  return useTranslation(original);
}
