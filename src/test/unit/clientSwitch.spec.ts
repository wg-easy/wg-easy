import { afterEach, expect, test, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, watch } from 'vue';

import { useSubmit } from '../../app/composables/useSubmit';
import { loadComponent } from '../helpers/component';
import { mount, renderer } from '../helpers/renderer';

const fetchClient = vi.fn();
const ClientSwitch = loadComponent('ClientCard/Switch', {
  imports: { '#imports': { $fetch: fetchClient } },
});
const BaseSwitch = loadComponent('Base/Switch');

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
  await mount(app);
  return { client, refresh, showToast, input, update };
}

test('restores the saved state and reports a failed toggle', async () => {
  const request = Promise.withResolvers();
  fetchClient.mockReturnValueOnce(request.promise);
  const view = await mountSwitch(true);

  view.update(false);
  await nextTick();
  expect(view.input.modelValue).toBe(false);

  request.reject(new Error('Update failed'));
  await vi.waitFor(() => {
    expect(view.refresh).toHaveBeenCalledOnce();
    expect(view.input.modelValue).toBe(true);
  });
  expect(view.showToast).toHaveBeenCalledExactlyOnceWith({
    type: 'error',
    message: 'Update failed',
  });
});

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
    expect(fetchClient).toHaveBeenCalledExactlyOnceWith(
      `/api/client/1/${enabled ? 'disable' : 'enable'}`,
      { method: 'post' }
    );

    request.resolve({ success: true });
    await vi.waitFor(() => expect(view.refresh).toHaveBeenCalledOnce());
    expect(view.input.modelValue).toBe(!enabled);
    expect(view.showToast).not.toHaveBeenCalled();
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
