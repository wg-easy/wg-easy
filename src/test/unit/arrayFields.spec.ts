import {
  moveArrayElement,
  type useSortable,
} from '@vueuse/integrations/useSortable';
import type Sortable from 'sortablejs';
import { afterEach, expect, test, vi } from 'vitest';
import {
  computed,
  h,
  nextTick,
  shallowRef,
  toRaw,
  useTemplateRef,
  type Ref,
} from 'vue';

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
  // Parent-owned arrays must never be mutated by field operations.
  const model = shallowRef<readonly string[] | null | undefined>(
    Object.freeze(value)
  );
  const updates = vi.fn((value: typeof model.value) => {
    model.value = Object.freeze(value);
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
  const [target, items, options] = useSortableMock.mock.lastCall!;
  const list = toRaw((target as Ref<RenderedNode>).value);
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
    list,
    updates,
    button,
    expectItems(expected: string[] | null) {
      expect(model.value).toEqual(expected);
      expect(inputs().map((node) => node.props.value)).toEqual(expected ?? []);
    },
    async drag(from: number, to: number) {
      const rows = list.children.filter((node) =>
        Object.hasOwn(node.props, 'data-array-item')
      );
      const item = rows[from]!;
      // Sortable moves the actual row first. VueUse then restores its DOM
      // position and updates the model, leaving Vue to render the new order.
      const element = {
        get children() {
          return list.children.filter((node) => node.tag !== '');
        },
        removeChild(child: RenderedNode) {
          list.children.splice(list.children.indexOf(child), 1);
        },
        insertBefore(child: RenderedNode, anchor: RenderedNode | null) {
          const index = list.children.indexOf(child);
          if (index >= 0) list.children.splice(index, 1);
          if (anchor)
            list.children.splice(list.children.indexOf(anchor), 0, child);
          else list.children.push(child);
        },
      };
      Object.assign(item, { parentNode: element });
      Object.defineProperty(item, 'nextSibling', {
        configurable: true,
        get: () => list.children[list.children.indexOf(item) + 1] ?? null,
      });
      const event = {
        item,
        from: element,
        oldIndex: from,
        newIndex: to,
      } as unknown as Sortable.SortableEvent;
      const sortable = {} as Sortable;
      options?.onStart?.call(sortable, event);
      element.removeChild(item);
      const target = rows[to]!;
      const targetIndex = list.children.indexOf(target);
      list.children.splice(targetIndex + (from < to ? 1 : 0), 0, item);
      if (options?.onUpdate) {
        options.onUpdate.call(sortable, event);
      } else {
        // This is useSortable's default onUpdate callback, including DOM undo.
        moveArrayElement(items as Ref<string[]>, from, to, event);
      }
      options?.onEnd?.call(sortable, event);
      await nextTick();
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

test('keeps displayed order and row actions aligned with immutable model updates', async () => {
  const view = await mountField(['same', 'same', '']);
  await view.drag(2, 0);
  view.expectItems(['', 'same', 'same']);
  await view.click('add');
  view.expectItems(['', 'same', 'same', '']);
  await view.edit(1, 'edited');
  view.expectItems(['', 'edited', 'same', '']);
  await view.drag(1, 3);
  view.expectItems(['', 'same', '', 'edited']);
  await view.click('delete', 1);
  view.expectItems(['', '', 'edited']);
  await view.click('add');
  view.expectItems(['', '', 'edited', '']);
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
  Object.assign(view.list, { querySelectorAll: () => handles });

  await view.key(0, 'ArrowUp');
  await view.key(1, 'ArrowDown');
  view.expectItems(['first', 'second']);
  expect(view.updates).not.toHaveBeenCalled();
  expect(focused).toBeUndefined();

  await view.key(0, 'ArrowDown');
  view.expectItems(['second', 'first']);
  expect(focused).toBe(view.button('reorder', 1));
  await view.key(1, 'ArrowUp');
  view.expectItems(['first', 'second']);
  expect(focused).toBe(view.button('reorder', 0));
});

test.each([
  { nullable: false, empty: [], message: 'common.form.noItems', cleared: [] },
  {
    nullable: true,
    empty: null,
    message: 'common.form.nullNoItems',
    cleared: null,
  },
  { nullable: true, empty: [], message: null, cleared: null },
])(
  'preserves empty state on mount and round-trips edits (nullable: $nullable, empty: $empty)',
  async ({ nullable, empty, message, cleared }) => {
    const view = await mountField(empty, nullable);
    view.expectItems(empty);
    expect(view.updates).not.toHaveBeenCalled();
    if (message) expect(textOf(view.root)).toContain(message);
    else expect(textOf(view.root)).not.toContain('common.form.nullNoItems');

    await view.click('add');
    view.expectItems(['']);
    expect(view.button('reorder').props.disabled).toBe(true);
    await view.click('delete');
    view.expectItems(cleared);
    expect(textOf(view.root)).toContain(
      nullable ? 'common.form.nullNoItems' : 'common.form.noItems'
    );
  }
);
