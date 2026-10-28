import { afterEach, expect, test, vi } from 'vitest';
import { computed, h, nextTick, ref } from 'vue';

import { loadComponent } from '../helpers/component';
import { descendants, mount, renderer, textOf } from '../helpers/renderer';

const ArrayField = loadComponent('Form/ArrayField');
const NullArrayField = loadComponent('Form/NullArrayField');

afterEach(() => vi.unstubAllGlobals());

async function mountField(nullable: boolean, value?: string[] | null) {
  vi.stubGlobal('computed', computed);
  const model = ref(value);
  const app = renderer.createApp({
    setup: () => () =>
      h(nullable ? NullArrayField : ArrayField, {
        name: 'allowedIps',
        modelValue: model.value,
        'onUpdate:modelValue': (value: string[] | null | undefined) => {
          model.value = value;
        },
      }),
  });
  app.config.globalProperties.$t = (key: string) => key;
  app.component('FormArrayField', ArrayField);
  app.component('BasePrimaryButton', loadComponent('Base/PrimaryButton'));
  app.component('BaseSecondaryButton', loadComponent('Base/SecondaryButton'));
  const root = await mount(app);
  const buttons = (label: string) =>
    descendants(root).filter(
      (node) => node.tag === 'button' && node.props['aria-label'] === label
    );

  return {
    model,
    root,
    buttons,
    async click(label: string, index = 0) {
      const button = buttons(label)[index];
      expect(button).toBeDefined();
      (button!.props.onClick as () => void)();
      await nextTick();
    },
    async add() {
      const button = descendants(root).find(
        (node) => node.tag === 'button' && textOf(node) === 'common.actions.add'
      );
      expect(button).toBeDefined();
      (button!.props.onClick as () => void)();
      await nextTick();
    },
  };
}

test.each([false, true])(
  'edits, reorders, removes, and adds array items (nullable: %s)',
  async (nullable) => {
    const view = await mountField(nullable, ['first', 'second']);
    expect(view.buttons('common.actions.moveUp')[0]?.props.disabled).toBe(true);
    expect(view.buttons('common.actions.moveDown')[1]?.props.disabled).toBe(
      true
    );

    await view.click('common.actions.moveUp', 1);
    expect(view.model.value).toEqual(['second', 'first']);
    await view.click('common.actions.moveDown');
    expect(view.model.value).toEqual(['first', 'second']);

    const input = descendants(view.root).find((node) => node.tag === 'input');
    expect(input?.props['aria-label']).toBe('allowedIps 1');
    (input!.props.onInput as (event: unknown) => void)({
      target: { value: 'edited' },
    });
    await nextTick();
    expect(view.model.value).toEqual(['edited', 'second']);

    await view.click('common.actions.delete');
    expect(view.model.value).toEqual(['second']);
    await view.click('common.actions.delete');
    expect(view.model.value).toEqual(nullable ? null : []);
    expect(textOf(view.root)).toContain(
      nullable ? 'common.form.nullNoItems' : 'common.form.noItems'
    );

    await view.add();
    expect(view.model.value).toEqual(['']);
  }
);

test.each([false, true])(
  'leaves an uninitialized array unchanged (nullable: %s)',
  async (nullable) => {
    const view = await mountField(nullable);
    await view.add();
    expect(view.model.value).toBeUndefined();
    expect(textOf(view.root)).toBe('common.actions.add');
  }
);

test.each([{ value: null }, { value: [] }])(
  'preserves the nullable empty state $value',
  async ({ value }) => {
    const view = await mountField(true, value);
    expect(view.model.value).toEqual(value);
    expect(textOf(view.root)).toBe(
      value === null
        ? 'common.form.nullNoItemscommon.actions.add'
        : 'common.actions.add'
    );
    await view.add();
    expect(view.model.value).toEqual(['']);
  }
);
