import { nextTick, ref } from 'vue';
import { describe, expect, test } from 'vitest';

import { useClientEnabled } from '../../app/composables/useClientEnabled';

describe('useClientEnabled', () => {
  test('synchronizes the switch value after a refreshed client changes enabled', async () => {
    const clientEnabled = ref(true);
    const enabled = useClientEnabled(() => clientEnabled.value);

    clientEnabled.value = false;
    await nextTick();

    expect(enabled.value).toBe(false);
  });
});
