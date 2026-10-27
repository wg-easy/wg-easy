import { afterEach, expect, test, vi } from 'vitest';
import {
  computed,
  defineComponent,
  h,
  nextTick,
  reactive,
  ref,
  watch,
} from 'vue';

import { loadComponent } from '../helpers/component';
import { descendants, mount, renderer, textOf } from '../helpers/renderer';

const BulkActions = loadComponent('Clients/BulkActions');

afterEach(() => vi.unstubAllGlobals());

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
  const app = renderer.createApp(BulkActions);
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
  const root = await mount(app);
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

test('offers actions appropriate to the selected clients', async () => {
  const view = await mountActions();
  for (const selected of [[true], [false], [true, false], []]) {
    view.store.selectedIds = selected.map((_, index) => index + 1);
    view.store.selectedClients = selected.map((enabled) => ({ enabled }));
    await nextTick();
    expect(view.button('bulk.actions').props.disabled).toBe(!selected.length);
    expect(view.button('bulk.enable', true).props.disabled).toBe(
      !selected.includes(false)
    );
    expect(view.button('bulk.disable', true).props.disabled).toBe(
      !selected.includes(true)
    );
    expect(view.button('bulk.delete', true).props.disabled).toBe(
      !selected.length
    );
  }
});

test.each(['isUpdatingList', 'isApplyingBulk'] as const)(
  'blocks actions while %s',
  async (busy) => {
    const view = await mountActions();
    view.store[busy] = true;
    await nextTick();
    expect(view.button('bulk.actions').props.disabled).toBe(true);
    for (const action of ['enable', 'disable', 'delete']) {
      expect(view.button(`bulk.${action}`, true).props.disabled).toBe(true);
    }
  }
);

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
