import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { transformSync } from 'esbuild';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import {
  createRenderer,
  defineComponent,
  h,
  nextTick,
  ref,
  watch,
  type Component,
} from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';

import { useSubmit } from '../../app/composables/useSubmit';

const fetchClient = vi.fn();
const require = createRequire(import.meta.url);

function loadComponent(path: string): Component {
  const { descriptor } = parse(
    readFileSync(
      new URL(`../../app/components/${path}.vue`, import.meta.url),
      'utf8'
    )
  );
  const script = compileScript(descriptor, { id: path, inlineTemplate: true });
  const { code } = transformSync(script.content, {
    loader: 'ts',
    format: 'cjs',
  });
  const module = { exports: {} as { default: Component } };
  new Function('require', 'module', 'exports', code)(
    (id: string) => (id === '#imports' ? { $fetch: fetchClient } : require(id)),
    module,
    module.exports
  );
  return module.exports.default;
}

const ClientSwitch = loadComponent('ClientCard/Switch');
const BaseSwitch = loadComponent('Base/Switch');

// Mount both real components and inspect the model passed to the Reka switch.
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

async function mountSwitch(enabled: boolean) {
  const client = ref({ id: 1, enabled });
  const refresh = vi.fn(async () => {
    client.value = { ...client.value };
  });
  const showToast = vi.fn();
  vi.stubGlobal('useClientsStore', () => ({ refresh }));
  vi.stubGlobal('useToast', () => ({ showToast }));
  for (const [name, value] of Object.entries({ ref, watch, useSubmit }))
    vi.stubGlobal(name, value);

  let input!: Readonly<{ modelValue: boolean }>;
  let update!: (value: boolean | undefined) => void;
  const app = renderer.createApp({
    setup: () => () => h(ClientSwitch, { client: client.value }),
  });
  app.config.globalProperties.$t = (key: string) => key;
  app.component('BaseSwitch', BaseSwitch);
  app.component('SwitchThumb', { render: () => null });
  app.component(
    'SwitchRoot',
    defineComponent({
      props: ['modelValue'],
      emits: ['update:modelValue'],
      setup(props, { emit }) {
        input = props as typeof input;
        update = (value) => emit('update:modelValue', value);
        return () => h('button');
      },
    })
  );
  app.mount(node());
  onTestFinished(() => app.unmount());
  await nextTick();
  return { client, refresh, showToast, input, update };
}

test.each([false, true])(
  'reverts a failed toggle when the refreshed enabled value remains %s',
  async (enabled) => {
    const request = Promise.withResolvers();
    fetchClient.mockReturnValueOnce(request.promise);
    const view = await mountSwitch(enabled);

    view.update(!enabled);
    await nextTick();
    expect(view.input.modelValue).toBe(!enabled);
    expect(fetchClient).toHaveBeenCalledExactlyOnceWith(
      `/api/client/1/${enabled ? 'disable' : 'enable'}`,
      { method: 'post', body: undefined }
    );

    request.reject(new Error('Update failed'));
    await vi.waitFor(() => {
      expect(view.refresh).toHaveBeenCalledOnce();
      expect(view.input.modelValue).toBe(enabled);
    });
    expect(view.showToast).toHaveBeenCalledExactlyOnceWith({
      type: 'error',
      message: 'Update failed',
    });
  }
);

test.each([false, true])(
  'keeps a successful toggle from %s in sync with refreshed client data',
  async (enabled) => {
    const request = Promise.withResolvers();
    fetchClient.mockReturnValueOnce(request.promise);
    const view = await mountSwitch(enabled);
    view.refresh.mockImplementationOnce(async () => {
      view.client.value = { id: 1, enabled: !enabled };
    });

    view.update(!enabled);
    await nextTick();
    expect(view.input.modelValue).toBe(!enabled);

    request.resolve({ success: true });
    await vi.waitFor(() => expect(view.refresh).toHaveBeenCalledOnce());
    expect(view.input.modelValue).toBe(!enabled);
    expect(view.showToast).not.toHaveBeenCalled();

    // A subsequent failed toggle must restore the newly saved value.
    fetchClient.mockRejectedValueOnce(new Error('Update failed'));
    view.update(enabled);
    await vi.waitFor(() => {
      expect(view.refresh).toHaveBeenCalledTimes(2);
      expect(view.input.modelValue).toBe(!enabled);
    });
  }
);

test('follows client state changes from polling or bulk actions', async () => {
  const view = await mountSwitch(false);

  view.client.value = { id: 1, enabled: true };
  await nextTick();
  expect(view.input.modelValue).toBe(true);

  view.client.value = { id: 1, enabled: false };
  await nextTick();
  expect(view.input.modelValue).toBe(false);
  expect(fetchClient).not.toHaveBeenCalled();
});
