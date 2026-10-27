import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { transformSync } from 'esbuild';
import * as Reka from 'reka-ui';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  computed,
  createSSRApp,
  h,
  ref,
  watch,
  type App,
  type Component,
} from 'vue';
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
const Checkbox = loadComponent('Base/Checkbox');
const BulkActions = loadComponent('Clients/BulkActions');
const ClientList = loadComponent('Clients/List');

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
    'AlertDialogRoot',
    'AlertDialogTrigger',
    'AlertDialogPortal',
    'DropdownMenuRoot',
    'DropdownMenuTrigger',
    'DropdownMenuPortal',
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

describe('bulk client controls', () => {
  test.each([false, true, 'indeterminate'] as const)(
    'renders an accessible Reka checkbox in the %s state',
    async (modelValue) => {
      const app = createSSRApp(Checkbox, {
        modelValue,
        label: 'Select laptop',
      });
      configureApp(app);
      const html = await renderToString(app);
      expect(html).toContain('role="checkbox"');
      expect(html).toContain('aria-label="Select laptop"');
      expect(html).toContain(
        `aria-checked="${modelValue === 'indeterminate' ? 'mixed' : modelValue}"`
      );
    }
  );

  test.each([
    { selected: [], updating: false, bulk: false, disabled: 1 },
    { selected: [true], updating: false, bulk: false, disabled: 0 },
    { selected: [false], updating: false, bulk: false, disabled: 0 },
    { selected: [true, false], updating: false, bulk: false, disabled: 0 },
    { selected: [true, false], updating: true, bulk: false, disabled: 3 },
    { selected: [true, false], updating: false, bulk: true, disabled: 3 },
  ])(
    'renders the appropriate action availability for $selected (updating: $updating, bulk: $bulk)',
    async ({ selected, updating, bulk, disabled }) => {
      vi.stubGlobal('ref', ref);
      vi.stubGlobal('computed', computed);
      vi.stubGlobal('watch', watch);
      vi.stubGlobal('useToast', () => ({ showToast: vi.fn() }));
      vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }));
      vi.stubGlobal('useClientsStore', () => ({
        clients: [{ id: 1 }, { id: 2 }],
        selectedIds: selected.map((_, index) => index + 1),
        selectedClients: selected.map((enabled) => ({ enabled })),
        pageSelection: selected.length ? 'indeterminate' : false,
        isUpdatingList: updating,
        isApplyingBulk: bulk,
      }));
      const app = createSSRApp(BulkActions);
      configureApp(app);
      const html = await renderToString(app);
      expect(html).toContain('Select this page');
      expect(html).toContain(`${selected.length} selected`);
      expect(html).toContain('aria-haspopup="menu"');
      expect(html).not.toContain('Enable selected');
      expect(html).not.toContain('Disable selected');
      expect(html).not.toContain('Delete selected');
      expect(html.match(/<button[^>]* disabled(?:[=>\s])/g) ?? []).toHaveLength(
        disabled
      );
    }
  );

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
