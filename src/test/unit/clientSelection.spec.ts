import { describe, expect, test } from 'vitest';

import {
  getBulkToggleTargetEnabled,
  getSelectedClientEnabledState,
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
    expect(
      toggleVisibleClientSelection(new Set([1, 2, 3, 9]), visible)
    ).toEqual(new Set([9]));
  });

  test('reports enabled when every selected client is enabled', () => {
    expect(
      getSelectedClientEnabledState(new Set([1, 2]), [
        { id: 1, enabled: true },
        { id: 2, enabled: true },
        { id: 3, enabled: false },
      ])
    ).toBe('enabled');
  });

  test('reports disabled when every selected client is disabled', () => {
    expect(
      getSelectedClientEnabledState(new Set([1, 2]), [
        { id: 1, enabled: false },
        { id: 2, enabled: false },
        { id: 3, enabled: true },
      ])
    ).toBe('disabled');
  });

  test('reports mixed when selected clients have different enabled states', () => {
    expect(
      getSelectedClientEnabledState(new Set([1, 2]), [
        { id: 1, enabled: true },
        { id: 2, enabled: false },
      ])
    ).toBe('mixed');
  });

  test('targets disable when every selected client is enabled', () => {
    expect(getBulkToggleTargetEnabled('enabled')).toBe(false);
  });

  test('targets enable for disabled and mixed selections', () => {
    expect(getBulkToggleTargetEnabled('disabled')).toBe(true);
    expect(getBulkToggleTargetEnabled('mixed')).toBe(true);
  });

  test('reports none when there is no selected client', () => {
    expect(
      getSelectedClientEnabledState(new Set(), [{ id: 1, enabled: true }])
    ).toBe('none');
  });
});
