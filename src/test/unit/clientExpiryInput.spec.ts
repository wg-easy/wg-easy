import { useMounted } from '@vueuse/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, ref } from 'vue';

import { loadComponent } from '../helpers/component';
import { mount, renderer } from '../helpers/renderer';

const DateField = loadComponent('Form/DateField');

beforeEach(() => {
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useMounted', useMounted);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function mountField(value: string | null) {
  const model = ref(value);
  const updates = vi.fn((value: string | null) => (model.value = value));
  let input!: Readonly<{ modelValue?: unknown }>;
  let update!: (value: unknown) => void;
  const app = renderer.createApp({
    setup: () => () =>
      h(DateField, {
        id: 'expiresAt',
        label: 'Expires At',
        modelValue: model.value,
        'onUpdate:modelValue': updates,
      }),
  });
  app.component('FormFieldLabel', { render: () => null });
  app.component(
    'BaseInput',
    defineComponent({
      props: ['modelValue'],
      emits: ['update:modelValue'],
      setup(props, { attrs, emit }) {
        input = props;
        update = (value) => emit('update:modelValue', value);
        expect(attrs.type).toBe('datetime-local');
        return () => h('input');
      },
    })
  );
  await mount(app);
  return { model, updates, input, update };
}

describe('client expiry input', () => {
  test.each([
    ['Europe/Berlin', '2026-07-15T14:35', '2026-07-15T12:35:00.000Z'],
    ['Europe/Berlin', '2026-12-15T14:35', '2026-12-15T13:35:00.000Z'],
    ['Asia/Kathmandu', '2026-10-27T14:35', '2026-10-27T08:50:00.000Z'],
  ])('round-trips local time in %s on %s', async (timezone, local, utc) => {
    vi.stubEnv('TZ', timezone);
    const field = await mountField(utc);
    expect(field.input.modelValue).toBe(local);
    expect(field.updates).not.toHaveBeenCalled();

    field.update('');
    await nextTick();
    expect(field.model.value).toBeNull();
    expect(field.input.modelValue).toBe('');

    field.update(local);
    await nextTick();
    expect(field.model.value).toBe(utc);
    expect(field.input.modelValue).toBe(local);
  });

  test('displays date-only values as midnight UTC without changing the saved value', async () => {
    vi.stubEnv('TZ', 'Europe/Berlin');
    const field = await mountField('2026-10-27');
    expect(field.input.modelValue).toBe('2026-10-27T01:00');
    expect(field.model.value).toBe('2026-10-27');
    expect(field.updates).not.toHaveBeenCalled();
  });

  test('ignores invalid input without overwriting the saved expiry', async () => {
    const field = await mountField('2026-10-27T12:34:56.789Z');
    field.update('invalid');
    expect(field.model.value).toBe('2026-10-27T12:34:56.789Z');
    expect(field.updates).not.toHaveBeenCalled();
  });
});
