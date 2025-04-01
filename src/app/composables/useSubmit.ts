import type {
  NitroFetchRequest,
  NitroFetchOptions,
  TypedInternalResponse,
  ExtractedRouteMethod,
} from 'nitropack/types';
import { FetchError } from 'ofetch';

type RevertFn<
  R extends NitroFetchRequest,
  T = unknown,
  O extends NitroFetchOptions<R> = NitroFetchOptions<R>,
> = (
  success: boolean,
  data:
    | TypedInternalResponse<
        R,
        T,
        NitroFetchOptions<R> extends O ? 'get' : ExtractedRouteMethod<R, O>
      >
    | undefined
) => Promise<void>;

type SubmitOpts<
  R extends NitroFetchRequest,
  T = unknown,
  O extends NitroFetchOptions<R> = NitroFetchOptions<R>,
> = {
  revert: RevertFn<R, T, O>;
  successMsg?: string;
  noSuccessToast?: boolean;
};

export function useSubmit<
  R extends NitroFetchRequest,
  O extends NitroFetchOptions<R> & { body?: never },
  T = unknown,
>(url: R, options: O, opts: SubmitOpts<R, T, O>) {
  const toast = useToast();

  return async (data: unknown) => {
    try {
      const res = await $fetch(url, {
        ...options,
        body: data,
      });

      if (!opts.noSuccessToast) {
        toast.showToast({
          type: 'success',
          message: opts.successMsg,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await opts.revert(true, res as any);
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
      await opts.revert(false, undefined);
    }
  };
}
