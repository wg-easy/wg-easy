import type { NitroFetchRequest, NitroFetchOptions } from 'nitropack/types';
import { FetchError } from 'ofetch';

type RevertFn = (success: boolean) => Promise<void>;

type SubmitOpts = {
  revert: RevertFn;
  successMsg?: string;
  errorMsg?: string;
  noSuccessToast?: boolean;
};

export function useSubmit<
  R extends NitroFetchRequest,
  O extends NitroFetchOptions<R> & { body?: never },
>(url: R, options: O, opts: SubmitOpts) {
  const toast = useToast();
  const { t: $t } = useI18n();

  return async (data: unknown) => {
    try {
      const res = await $fetch(url, {
        ...options,
        body: data,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(res as any).success) {
        throw new Error(opts.errorMsg || $t('toast.errored'));
      }

      if (!opts.noSuccessToast) {
        toast.showToast({
          type: 'success',
          message: opts.successMsg,
        });
      }

      await opts.revert(true);
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
      await opts.revert(false);
    }
  };
}
