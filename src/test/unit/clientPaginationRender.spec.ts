import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { transformSync } from 'esbuild';
import * as Reka from 'reka-ui';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { computed, createSSRApp, type App, type Component } from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';
import { renderToString } from 'vue/server-renderer';

import en from '../../i18n/locales/en.json';

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
    templateOptions: { ssr: true },
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

const Pagination = loadComponent('Clients/Pagination');
const ClientSelect = loadComponent('Clients/Select');
const BaseSelect = loadComponent('Base/Select');

function configureApp(app: App) {
  // Render the actual Reka controls, including their disabled states and labels.
  for (const name of [
    'PaginationRoot',
    'PaginationPrev',
    'PaginationNext',
    'SelectRoot',
    'SelectTrigger',
    'SelectValue',
    'SelectIcon',
    'SelectPortal',
    'SelectContent',
    'SelectViewport',
    'SelectItem',
    'SelectItemText',
    'SelectItemIndicator',
  ] as const) {
    app.component(name, Reka[name]);
  }
  app.component('BaseSelect', BaseSelect);
  app.config.globalProperties.$t = (
    key: string,
    params: Record<string, number> = {}
  ) => {
    const message = en.ui[key.replace('ui.', '') as keyof typeof en.ui];
    if (typeof message !== 'string') throw new Error(`Missing label: ${key}`);
    return message.replace(/\{(\w+)\}/g, (_, name) => String(params[name]));
  };
}

afterEach(() => vi.unstubAllGlobals());

async function renderPagination(total: number, page = 1, loading = false) {
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useClientsStore', () => ({
    totalPages: Math.max(1, Math.ceil(total / 25)),
    query: { pageSize: 25 },
    pagination: { total, pageSize: 25, page },
    isUpdatingList: loading,
  }));
  const app = createSSRApp(Pagination);
  configureApp(app);
  return renderToString(app);
}

describe('client pagination rendering', () => {
  test.each([0, 1, 25])(
    'keeps navigation visible with %i clients',
    async (total) => {
      const html = await renderPagination(total);
      expect(html).toContain('<nav');
      expect(html).toContain('Page 1 of 1');
      expect(html).toContain(
        `${total === 0 ? 0 : 1}–${total} of ${total} clients`
      );
      expect(html.match(/<button[^>]* disabled(?:[=>\s])/g)).toHaveLength(2);
      expect(html).toContain('Per page');
      const pageSizeTrigger = html.match(
        /<button[^>]*role="combobox"[^>]*>[\s\S]*?<\/button>/
      )?.[0];
      expect(pageSizeTrigger).toContain('aria-label="Per page"');
      expect(pageSizeTrigger?.replace(/<[^>]*>/g, '')).toBe('25');
    }
  );

  test('shows the last page range and only disables next', async () => {
    const html = await renderPagination(26, 2);
    expect(html).toContain('26–26 of 26 clients');
    expect(html).toContain('Page 2 of 2');
    expect(html.match(/<button[^>]* disabled(?:[=>\s])/g)).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*aria-label="Next"[^>]*disabled/);
  });

  test('disables both navigation buttons while updating results', async () => {
    const html = await renderPagination(60, 2, true);
    expect(html.match(/<button[^>]* disabled(?:[=>\s])/g)).toHaveLength(2);
  });
});

describe('client select rendering', () => {
  test.each([
    ['Status', 'online', 'Online'],
    ['Expiry', 'permanent', 'Never expires'],
    ['Sort by', 'createdAt:desc', 'Newest first'],
  ])(
    'renders the selected %s label before hydration',
    async (label, value, text) => {
      vi.stubGlobal('computed', computed);
      const app = createSSRApp(ClientSelect, {
        label,
        modelValue: value,
        options: [{ value, label: text }],
      });
      configureApp(app);
      const html = await renderToString(app);
      const labelId = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
      expect(labelId).toBeTruthy();
      expect(html).toContain(`id="${labelId}"`);
      expect(html).toContain('role="combobox"');
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(text);
      expect(html).not.toContain(`${value} - ${text}`);
    }
  );

  test('preserves value and label formatting for existing address suggestions', async () => {
    vi.stubGlobal('computed', computed);
    const app = createSSRApp(BaseSelect, {
      modelValue: '192.0.2.1',
      options: [{ value: '192.0.2.1', label: 'IPv4' }],
    });
    configureApp(app);
    expect(await renderToString(app)).toContain('192.0.2.1 - IPv4');
  });
});
