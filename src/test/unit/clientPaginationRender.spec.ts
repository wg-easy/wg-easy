import * as Reka from 'reka-ui';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { computed, createSSRApp, h, type App } from 'vue';
import { renderToString } from 'vue/server-renderer';

import en from '../../i18n/locales/en.json';
import { loadComponent } from '../helpers/component';

const Pagination = loadComponent('Clients/Pagination', { ssr: true });
const ClientSelect = loadComponent('Clients/Select', { ssr: true });
const BaseSelect = loadComponent('Base/Select', { ssr: true });
const Checkbox = loadComponent('Base/Checkbox', { ssr: true });
const ClientList = loadComponent('Clients/List', { ssr: true });

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
    'CheckboxRoot',
    'CheckboxIndicator',
  ] as const) {
    app.component(name, Reka[name]);
  }
  app.component('BaseSelect', BaseSelect);
  app.component('BaseCheckbox', Checkbox);
  app.config.globalProperties.$t = (
    key: string,
    params: Record<string, number> = {}
  ) => {
    const message = key
      .split('.')
      .reduce<unknown>(
        (value, part) => (value as Record<string, unknown>)[part],
        en
      );
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
  test.each([0, 25])(
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
      expect(pageSizeTrigger).toContain('>25<');
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

describe('bulk client controls', () => {
  test.each([false, true])(
    'only shows client checkboxes in selection mode (%s)',
    async (selectable) => {
      vi.stubGlobal('useClientsStore', () => ({
        clients: [{ id: 1, name: 'Laptop' }],
        selectedIds: [],
      }));
      const app = createSSRApp(ClientList, { selectable });
      configureApp(app);
      app.component('ClientCard', {
        setup:
          (_, { slots }) =>
          () =>
            h('article', slots.selection?.()),
      });
      const html = await renderToString(app);
      expect(html.includes('role="checkbox"')).toBe(selectable);
    }
  );
});

describe('client select rendering', () => {
  test('shows the selected option with an accessible label', async () => {
    vi.stubGlobal('computed', computed);
    const app = createSSRApp(ClientSelect, {
      label: 'Status',
      modelValue: 'online',
      options: [{ value: 'online', label: 'Online' }],
    });
    configureApp(app);
    const html = await renderToString(app);
    const labelId = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
    expect(labelId).toBeTruthy();
    expect(html).toContain(`id="${labelId}"`);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="Status"');
    expect(html).toContain('Online');
  });
});
