import {
  moveArrayElement,
  type useSortable,
} from '@vueuse/integrations/useSortable';
import { afterEach, expect, test, vi } from 'vitest';
import { computed, h, nextTick, ref, useTemplateRef, type Ref } from 'vue';

import { loadComponent } from '../helpers/component';
import { descendants, mount, renderer, textOf } from '../helpers/renderer';

const useSortableMock = vi.fn<typeof useSortable>();
const ArrayField = loadComponent('Form/ArrayField', {
  imports: {
    '@vueuse/integrations/useSortable': {
      moveArrayElement,
      useSortable: useSortableMock,
    },
  },
});
const NullArrayField = loadComponent('Form/NullArrayField');
type RenderedNode = ReturnType<typeof descendants>[number];

afterEach(() => {
  vi.unstubAllGlobals();
  useSortableMock.mockClear();
});

async function dispatch(node: RenderedNode, event: string, value?: unknown) {
  const handlers = node.props[event] as
    ((value: unknown) => void) | ((value: unknown) => void)[];
  for (const handler of [handlers].flat()) handler(value);
  // VueUse schedules the model update before Vue renders the new order.
  await nextTick();
  await nextTick();
}

async function mountField(value: string[] | null, nullable = false) {
  for (const [name, fn] of Object.entries({
    computed,
    useTemplateRef,
    nextTick,
  }))
    vi.stubGlobal(name, fn);
  const model = ref<string[] | null | undefined>(value);
  const updates = vi.fn((value: typeof model.value) => {
    model.value = value;
  });
  const app = renderer.createApp({
    setup: () => () =>
      h(nullable ? NullArrayField : ArrayField, {
        name: 'allowedIps',
        modelValue: model.value,
        'onUpdate:modelValue': updates,
      }),
  });
  app.config.globalProperties.$t = (key: string) => key;
  app.component('FormArrayField', ArrayField);
  app.component('BasePrimaryButton', loadComponent('Base/PrimaryButton'));
  app.component('BaseSecondaryButton', loadComponent('Base/SecondaryButton'));
  const root = await mount(app);
  const sortableItems = useSortableMock.mock.calls.at(-1)![1] as Ref<string[]>;
  const inputs = () => descendants(root).filter((node) => node.tag === 'input');
  const button = (action: string, index = 0) =>
    descendants(root).filter(
      (node) =>
        node.tag === 'button' &&
        (node.props['aria-label'] === `common.actions.${action}` ||
          textOf(node) === `common.actions.${action}`)
    )[index]!;

  return {
    root,
    model,
    updates,
    button,
    values: () => inputs().map((node) => node.props.value),
    // Sorting is owned by VueUse; exercise the component's model boundary.
    async sort(items: string[]) {
      sortableItems.value = items;
      await nextTick();
    },
    edit: (index: number, value: string) =>
      dispatch(inputs()[index]!, 'onInput', { target: { value } }),
    click: (action: string, index = 0) =>
      dispatch(button(action, index), 'onClick'),
    key: (index: number, key: string) =>
      dispatch(button('reorder', index), 'onKeydown', {
        key,
        preventDefault() {},
      }),
  };
}

test('keeps rendered rows and model updates aligned after sorting, without mutating existing arrays', async () => {
  const original = ['first', '', 'first'];
  const reordered = ['first', 'first', ''];
  const view = await mountField(original);
  await view.sort(reordered);
  expect(view.updates).toHaveBeenCalledExactlyOnceWith(reordered);
  expect(view.values()).toEqual(reordered);
  expect(original).toEqual(['first', '', 'first']);

  await view.edit(1, 'edited');
  await view.click('delete', 0);
  expect(view.model.value).toEqual(['edited', '']);
  expect(view.values()).toEqual(['edited', '']);
  expect(reordered).toEqual(['first', 'first', '']);
});

test('keyboard moves stay in bounds and keep focus on the moved row', async () => {
  const view = await mountField(['first', 'second']);
  const handles = [view.button('reorder', 0), view.button('reorder', 1)];
  let focused: RenderedNode | undefined;
  // Supply only the DOM focus primitives missing from the test renderer.
  for (const handle of handles)
    Object.assign(handle, {
      focus: () => {
        focused = handle;
      },
    });
  Object.assign(view.root.children[0]!, { querySelectorAll: () => handles });

  await view.key(0, 'ArrowUp');
  await view.key(1, 'ArrowDown');
  expect(view.updates).not.toHaveBeenCalled();
  expect(focused).toBeUndefined();

  await view.key(0, 'ArrowDown');
  expect(view.model.value).toEqual(['second', 'first']);
  expect(view.values()).toEqual(['second', 'first']);
  expect(focused).toBe(view.button('reorder', 1));
  await view.key(1, 'ArrowUp');
  expect(view.model.value).toEqual(['first', 'second']);
  expect(focused).toBe(view.button('reorder', 0));
});

test.each([
  { nullable: false, empty: [], message: 'common.form.noItems' },
  { nullable: true, empty: null, message: 'common.form.nullNoItems' },
])(
  'round-trips the empty state without rewriting it on mount (nullable: $nullable)',
  async ({ nullable, empty, message }) => {
    const view = await mountField(empty, nullable);
    expect(view.updates).not.toHaveBeenCalled();
    expect(textOf(view.root)).toContain(message);
    await view.click('add');
    expect(view.model.value).toEqual(['']);
    expect(view.button('reorder').props.disabled).toBe(true);
    await view.click('delete');
    expect(view.model.value).toEqual(empty);
    expect(textOf(view.root)).toContain(message);
  }
);

test('preserves an explicit empty list instead of inheriting global configuration', async () => {
  const view = await mountField([], true);
  expect(view.model.value).toEqual([]);
  expect(view.updates).not.toHaveBeenCalled();
  expect(textOf(view.root)).not.toContain('common.form.nullNoItems');
});
