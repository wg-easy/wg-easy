import { onTestFinished } from 'vitest';
import { createRenderer, nextTick, type App } from 'vue';

type TestNode = {
  tag: string;
  text: string;
  props: Record<string, unknown>;
  children: TestNode[];
  parent?: TestNode;
};

const node = (tag = '', text = ''): TestNode => ({
  tag,
  text,
  props: {},
  children: [],
});

// Keep rendered text, props, and event handlers available to component tests.
export const renderer = createRenderer<TestNode, TestNode>({
  createElement: (tag) => node(tag),
  createText: (text) => node('', text),
  createComment: () => node(),
  insert(child, parent, anchor) {
    if (child.parent) {
      const siblings = child.parent.children;
      siblings.splice(siblings.indexOf(child), 1);
    }
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(child);
    else parent.children.splice(index, 0, child);
  },
  remove(child) {
    const siblings = child.parent?.children;
    if (siblings) siblings.splice(siblings.indexOf(child), 1);
    child.parent = undefined;
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

export async function mount(app: App) {
  const root = node();
  app.mount(root);
  onTestFinished(() => app.unmount());
  await nextTick();
  return root;
}

export function textOf(node: TestNode): string {
  return node.text + node.children.map(textOf).join('');
}

export function descendants(node: TestNode): TestNode[] {
  return [node, ...node.children.flatMap(descendants)];
}
