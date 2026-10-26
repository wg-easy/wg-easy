import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { formatTimeAgoIntl, useMounted } from '@vueuse/core';
import { transformSync } from 'esbuild';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  computed,
  createSSRApp,
  defineComponent,
  h,
  ref,
  type Component,
} from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';
import { renderToString } from 'vue/server-renderer';

import { useHydrationTime } from '../../app/composables/useHydrationTime';
import { isPeerConnected } from '../../shared/utils/time';

const require = createRequire(import.meta.url);

// Compile the real templates so the test covers the badge and avatar bindings.
function loadComponent(name: string): Component {
  const filename = new URL(
    `../../app/components/ClientCard/${name}.vue`,
    import.meta.url
  );
  const { descriptor } = parse(readFileSync(filename, 'utf8'));
  const script = compileScript(descriptor, {
    id: name,
    inlineTemplate: true,
    templateOptions: { ssr: true },
  });
  const { code } = transformSync(script.content, {
    loader: 'ts',
    format: 'cjs',
  });
  const module = { exports: {} as { default: Component } };
  new Function('require', 'module', 'exports', code)(
    require,
    module,
    module.exports
  );
  return module.exports.default;
}

const Card = loadComponent('ClientCard');
const Avatar = loadComponent('Avatar');
const LastSeen = loadComponent('LastSeen');
const Stub = defineComponent({
  props: ['client', 'img'],
  setup(_, { slots }) {
    return () => h('span', slots.default?.());
  },
});

const serverTime = new Date('2026-10-26T10:00:00Z').getTime();
const initialTime = ref<number>();

async function renderCard(latestHandshakeAt: string | null, enabled = true) {
  const app = createSSRApp(Card, {
    client: { id: 1, name: 'Test client', latestHandshakeAt, enabled },
  });
  app.config.globalProperties.$t = (key: string) => key;
  app.config.globalProperties.$d = (date: Date) => date.toISOString();
  app.component('ClientCardAvatar', Avatar);
  app.component('ClientCardLastSeen', LastSeen);
  app.component('BaseAvatar', Stub);
  for (const name of [
    'Name',
    'Address',
    'ExpireDate',
    'Transfer',
    'Charts',
    'Switch',
    'Edit',
    'QRCode',
    'Config',
    'OneTimeLinkBtn',
    'OneTimeLink',
  ]) {
    app.component(`ClientCard${name}`, Stub);
  }
  return renderToString(app);
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(serverTime);
  initialTime.value = undefined;
  vi.stubGlobal('useState', (_key: string, init: () => number) => {
    initialTime.value ??= init();
    return initialTime;
  });
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useMounted', useMounted);
  vi.stubGlobal('useHydrationTime', useHydrationTime);
  vi.stubGlobal('isPeerConnected', isPeerConnected);
  vi.stubGlobal('formatTimeAgoIntl', formatTimeAgoIntl);
  vi.stubGlobal('useGlobalStore', () => ({ uiShowCharts: false }));
  vi.stubGlobal('useI18n', () => ({
    localeProperties: ref({ language: 'en-US' }),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('client card hydration', () => {
  test.each([1000, 300_000, -300_000])(
    'preserves server markup with a %i ms client clock difference',
    async (offset) => {
      const handshake = new Date(serverTime - 599_500).toISOString();
      const serverHtml = await renderCard(handshake);
      expect(serverHtml).toContain('ui.online');
      expect(serverHtml).toContain('bg-success');

      // Restore the timestamp payload before the first client render.
      const payload = JSON.stringify({ time: initialTime.value });
      initialTime.value = JSON.parse(payload).time;
      vi.mocked(Date.now).mockReturnValue(serverTime + offset);
      expect(await renderCard(handshake)).toBe(serverHtml);
    }
  );

  test('keeps disabled and never-connected clients offline', async () => {
    const disabled = await renderCard(
      new Date(serverTime).toISOString(),
      false
    );
    expect(disabled).toContain('ui.disabled');
    expect(disabled).toContain('bg-subtle');
    const neverConnected = await renderCard(null);
    expect(neverConnected).toContain('ui.offline');
    expect(neverConnected).toContain('bg-subtle');
  });
});
