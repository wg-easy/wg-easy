import type { NitroFetchRequest, NitroFetchOptions } from 'nitropack/types';
import { FetchError } from 'ofetch';

type RevertFn = () => Promise<void>;

export function useSubmit<
  R extends NitroFetchRequest,
  O extends NitroFetchOptions<R>,
>(url: R, options: O, revert: RevertFn, success?: string, error?: string) {
  const toast = useToast();
  const { t: $t } = useI18n();

  return async () => {
    try {
      const res = await $fetch(url, options);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(res as any).success) {
        throw new Error(error || $t('toast.errored'));
      }
      toast.showToast({
        type: 'success',
        message: success,
      });
      await revert();
    } catch (e) {
      if (e instanceof FetchError) {
        toast.showToast({
          type: 'error',
          message: e.data.message,
        });
      } else if (e instanceof Error) {
        toast.showToast({
          type: 'error',
          message: e.message,
        });
      } else {
        console.error(e);
      }
      await revert();
    }
  };
}
