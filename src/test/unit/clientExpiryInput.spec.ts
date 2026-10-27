import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { useMounted } from '@vueuse/core';
import { transformSync } from 'esbuild';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  computed,
  createRenderer,
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
} from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';

function loadComponent(path: string): Component {
  const { descriptor } = parse(
    readFileSync(
      new URL(`../../app/components/${path}.vue`, import.meta.url),
      'utf8'
    )
  );
  const script = compileScript(descriptor, {
    id: path,
    inlineTemplate: true,
  });
  const { code } = transformSync(script.content, {
    loader: 'ts',
    format: 'cjs',
  });
  const module = { exports: {} as { default: Component } };
  new Function('require', 'module', 'exports', code)(
    createRequire(import.meta.url),
    module,
    module.exports
  );
  return module.exports.default;
}

const DateField = loadComponent('Form/DateField');

// Mount the real field without a browser; inspect its BaseInput boundary.
type Node = { children: Node[]; parent?: Node };
const node = (): Node => ({ children: [] });
const renderer = createRenderer<Node, Node>({
  createElement: node,
  createText: node,
  createComment: node,
  insert(child, parent, anchor) {
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(child);
    else parent.children.splice(index, 0, child);
  },
  remove(child) {
    const siblings = child.parent?.children;
    if (siblings) siblings.splice(siblings.indexOf(child), 1);
  },
  setText: () => {},
  setElementText: () => {},
  patchProp: () => {},
  parentNode: (child) => child.parent ?? null,
  nextSibling(child) {
    const siblings = child.parent?.children;
    return siblings?.[siblings.indexOf(child) + 1] ?? null;
  },
});

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
  app.component('FormLabel', {
    setup:
      (_, { slots }) =>
      () =>
        h('label', slots.default?.()),
  });
  app.component('BaseTooltip', { render: () => null });
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
  app.mount(node());
  await nextTick();
  return { model, updates, input, update, unmount: () => app.unmount() };
}

describe('client expiry input', () => {
  test.each([
    ['UTC', '2026-10-27T00:00', '2026-10-27T14:35:00.000Z'],
    ['Europe/Berlin', '2026-10-27T01:00', '2026-10-27T13:35:00.000Z'],
    ['America/New_York', '2026-10-26T20:00', '2026-10-27T18:35:00.000Z'],
    ['Asia/Kathmandu', '2026-10-27T05:45', '2026-10-27T08:50:00.000Z'],
  ])(
    'preserves legacy dates and saves local time as UTC in %s',
    async (timezone, legacyDisplay, saved) => {
      vi.stubEnv('TZ', timezone);
      const field = await mountField('2026-10-27');
      try {
        expect(field.input.modelValue).toBe(legacyDisplay);
        expect(field.model.value).toBe('2026-10-27');
        expect(field.updates).not.toHaveBeenCalled();

        field.update('2026-10-27T14:35');
        await nextTick();
        expect(field.model.value).toBe(saved);
        expect(field.input.modelValue).toBe('2026-10-27T14:35');

        field.model.value = '2026-10-27T00:00:00.000Z';
        await nextTick();
        expect(field.input.modelValue).toBe(legacyDisplay);

        field.update('');
        await nextTick();
        expect(field.model.value).toBeNull();
        expect(field.input.modelValue).toBe('');
      } finally {
        field.unmount();
      }
    }
  );

  test.each([
    ['2026-07-15T14:35', '2026-07-15T12:35:00.000Z'],
    ['2026-12-15T14:35', '2026-12-15T13:35:00.000Z'],
  ])(
    'uses the timezone offset on the selected date: %s',
    async (local, utc) => {
      vi.stubEnv('TZ', 'Europe/Berlin');
      const field = await mountField(null);
      try {
        field.update(local);
        await nextTick();
        expect(field.model.value).toBe(utc);
        expect(field.input.modelValue).toBe(local);

        field.model.value = null;
        await nextTick();
        expect(field.input.modelValue).toBe('');
      } finally {
        field.unmount();
      }
    }
  );

  test('does not overwrite an unchanged expiry or throw on invalid input', async () => {
    const field = await mountField('2026-10-27T12:34:56.789Z');
    try {
      field.update('invalid');
      field.update(undefined);
      expect(field.model.value).toBe('2026-10-27T12:34:56.789Z');
      expect(field.updates).not.toHaveBeenCalled();
    } finally {
      field.unmount();
    }
  });
});
