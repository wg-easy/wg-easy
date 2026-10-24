import { FetchError } from 'ofetch';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useSubmit } from '../../app/composables/useSubmit';

const showToast = vi.fn();

beforeEach(() => {
  showToast.mockClear();
  vi.stubGlobal('useToast', () => ({ showToast }));
});

describe('useSubmit', () => {
  test('reverts when a FetchError has no response body', async () => {
    const revert = vi.fn(async () => {});
    const submit = useSubmit(
      async () => {
        throw new FetchError('Failed to fetch');
      },
      { revert }
    );

    await submit(undefined);

    expect(revert).toHaveBeenCalledWith(false, undefined);
    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Failed to fetch',
    });
  });

  test('shows the API message when the response has one', async () => {
    const revert = vi.fn(async () => {});
    const error = new FetchError('Bad Request');
    error.data = { message: 'Client is already disabled' };
    const submit = useSubmit(
      async () => {
        throw error;
      },
      { revert }
    );

    await submit(undefined);

    expect(showToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Client is already disabled',
    });
    expect(revert).toHaveBeenCalledOnce();
  });
});
