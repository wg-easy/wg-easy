import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { transformSync } from 'esbuild';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import {
  computed,
  createRenderer,
  defineComponent,
  h,
  nextTick,
  reactive,
  ref,
  watch,
  type Component,
} from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';

const { descriptor } = parse(
  readFileSync(
    new URL('../../app/components/Clients/BulkActions.vue', import.meta.url),
    'utf8'
  )
);
const script = compileScript(descriptor, {
  id: 'bulk-actions',
  inlineTemplate: true,
});
const { code } = transformSync(script.content, { loader: 'ts', format: 'cjs' });
const module = { exports: {} as { default: Component } };
new Function('require', 'module', 'exports', code)(
  createRequire(import.meta.url),
  module,
  module.exports
);

// Exercise the real event bindings at the Reka component boundary.
type Node = {
  tag: string;
  text: string;
  props: Record<string, unknown>;
  children: Node[];
  parent?: Node;
};
const node = (tag = '', text = ''): Node => ({
  tag,
  text,
  props: {},
  children: [],
});
const renderer = createRenderer<Node, Node>({
  createElement: (tag) => node(tag),
  createText: (text) => node('', text),
  createComment: () => node(),
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
  setText: (node, text) => {
    node.text = text;
  },
  setElementText: (node, text) => {
    node.text = text;
    node.children = [];
  },
  patchProp: (node, key, _old, value) => {
    node.props[key] = value;
  },
  parentNode: (child) => child.parent ?? null,
  nextSibling(child) {
    const siblings = child.parent?.children;
    return siblings?.[siblings.indexOf(child) + 1] ?? null;
  },
});

afterEach(() => vi.unstubAllGlobals());

function textOf(node: Node): string {
  return node.text + node.children.map(textOf).join('');
}

function descendants(node: Node): Node[] {
  return [node, ...node.children.flatMap(descendants)];
}

async function mountActions() {
  const applyBulkAction = vi.fn().mockResolvedValue(true);
  const store = reactive({
    clients: [{ id: 1 }, { id: 2 }],
    selectedIds: [1, 2],
    selectedClients: [{ enabled: true }, { enabled: false }],
    pageSelection: true,
    isUpdatingList: false,
    isApplyingBulk: false,
    applyBulkAction,
  });
  vi.stubGlobal('useClientsStore', () => store);
  vi.stubGlobal('useToast', () => ({ showToast: vi.fn() }));
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }));
  for (const [name, value] of Object.entries({ computed, ref, watch }))
    vi.stubGlobal(name, value);
  const app = renderer.createApp(module.exports.default);
  app.config.globalProperties.$t = (key: string, params?: { count: number }) =>
    `${key}${params ? ` ${params.count}` : ''}`;
  const Wrapper = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', slots.default?.()),
  });
  for (const name of [
    'BaseCheckbox',
    'DropdownMenuRoot',
    'DropdownMenuTrigger',
    'DropdownMenuPortal',
    'DropdownMenuContent',
    'DropdownMenuSeparator',
    'AlertDialogPortal',
    'AlertDialogOverlay',
    'AlertDialogContent',
    'AlertDialogTitle',
    'AlertDialogDescription',
  ])
    app.component(name, Wrapper);
  let updateOpen!: (open: boolean) => void;
  app.component(
    'AlertDialogRoot',
    defineComponent({
      props: ['open'],
      emits: ['update:open'],
      setup: (_, { slots, emit }) => {
        updateOpen = (open) => emit('update:open', open);
        return () => h('div', slots.default?.());
      },
    })
  );
  app.component(
    'AlertDialogCancel',
    defineComponent({
      setup:
        (_, { slots }) =>
        () =>
          h('button', { onClick: () => updateOpen(false) }, slots.default?.()),
    })
  );
  app.component(
    'DropdownMenuItem',
    defineComponent({
      props: ['disabled'],
      emits: ['select'],
      setup:
        (props, { slots, emit }) =>
        () =>
          h(
            'button',
            {
              'data-menu-item': true,
              disabled: props.disabled,
              onClick: () => emit('select'),
            },
            slots.default?.()
          ),
    })
  );
  const root = node();
  app.mount(root);
  onTestFinished(() => app.unmount());
  await nextTick();
  function button(label: string, menuItem = false) {
    const found = descendants(root).find(
      (node) =>
        node.tag === 'button' &&
        textOf(node).trim() === label &&
        Boolean(node.props['data-menu-item']) === menuItem
    );
    expect(found, `Missing button: ${label}`).toBeDefined();
    return found!;
  }
  async function click(label: string, menuItem = false) {
    const target = button(label, menuItem);
    expect(target.props.disabled).not.toBe(true);
    await (target.props.onClick as () => unknown)();
    await nextTick();
  }
  return { store, applyBulkAction, root, button, click };
}

test.each(['enable', 'disable', 'delete'])(
  '%s only runs after explicit confirmation and can be cancelled',
  async (action) => {
    const view = await mountActions();
    await view.click(`bulk.${action}`, true);
    expect(textOf(view.root)).toContain(`bulk.${action}Title 2`);
    expect(textOf(view.root)).toContain(`bulk.${action}Description`);
    expect(view.applyBulkAction).not.toHaveBeenCalled();
    await view.click('dialog.cancel');
    expect(textOf(view.root)).not.toContain(`bulk.${action}Title`);
    expect(view.applyBulkAction).not.toHaveBeenCalled();
    await view.click(`bulk.${action}`, true);
    await view.click(`bulk.${action}`);
    expect(view.applyBulkAction).toHaveBeenCalledExactlyOnceWith(action);
    expect(textOf(view.root)).not.toContain(`bulk.${action}Title`);
  }
);

test('invalidates an open confirmation when selection changes', async () => {
  const view = await mountActions();
  await view.click('bulk.delete', true);
  view.store.selectedIds = [2];
  await nextTick();
  expect(textOf(view.root)).not.toContain('bulk.deleteTitle');
  expect(view.applyBulkAction).not.toHaveBeenCalled();
});

test('keeps a failed action in the confirmation dialog for retry', async () => {
  const view = await mountActions();
  view.applyBulkAction.mockRejectedValueOnce(new Error('Failed'));
  await view.click('bulk.disable', true);
  await view.click('bulk.disable');
  expect(textOf(view.root)).toContain('bulk.disableTitle 2');
  expect(textOf(view.root)).toContain('bulk.failed');
  await view.click('bulk.disable');
  expect(view.applyBulkAction).toHaveBeenCalledTimes(2);
});
