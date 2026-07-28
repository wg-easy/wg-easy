import { describe, expect, test } from 'vitest';

import {
  getSelectionState,
  toggleClientSelection,
  toggleVisibleClientSelection,
} from '../../app/utils/clientSelection';

describe('client selection', () => {
  const visible = [1, 2, 3];

  test('selects all currently visible client IDs', () => {
    expect(toggleVisibleClientSelection(new Set([9]), visible)).toEqual(
      new Set([1, 2, 3, 9])
    );
  });

  test('marks the master control indeterminate after removing one client', () => {
    const selected = toggleClientSelection(new Set(visible), 2);

    expect(getSelectionState(selected, visible)).toBe('partial');
  });

  test('clears every visible selection while retaining non-visible IDs', () => {
    expect(toggleVisibleClientSelection(new Set([1, 2, 3, 9]), visible)).toEqual(
      new Set([9])
    );
  });
});
