export type SelectionState = 'none' | 'partial' | 'all';

export function getSelectionState(
  selected: Set<number>,
  visibleIds: number[]
): SelectionState {
  const selectedVisible = visibleIds.filter((id) => selected.has(id)).length;

  if (selectedVisible === 0 || visibleIds.length === 0) {
    return 'none';
  }

  if (selectedVisible === visibleIds.length) {
    return 'all';
  }

  return 'partial';
}

export type SelectedClientEnabledState =
  'none' | 'enabled' | 'disabled' | 'mixed';

export function getSelectedClientEnabledState(
  selected: Set<number>,
  clients: readonly { id: number; enabled: boolean }[]
): SelectedClientEnabledState {
  const selectedStates = clients
    .filter((client) => selected.has(client.id))
    .map((client) => client.enabled);

  if (selectedStates.length === 0) {
    return 'none';
  }

  if (selectedStates.every(Boolean)) {
    return 'enabled';
  }

  if (selectedStates.every((enabled) => !enabled)) {
    return 'disabled';
  }

  return 'mixed';
}

export function getBulkToggleTargetEnabled(state: SelectedClientEnabledState) {
  return state !== 'enabled';
}

export function toggleClientSelection(selected: Set<number>, id: number) {
  const next = new Set(selected);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
}

export function toggleVisibleClientSelection(
  selected: Set<number>,
  visibleIds: number[]
) {
  const next = new Set(selected);
  const state = getSelectionState(selected, visibleIds);

  for (const id of visibleIds) {
    if (state === 'all') {
      next.delete(id);
    } else {
      next.add(id);
    }
  }

  return next;
}
