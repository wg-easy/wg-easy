import { FetchError } from 'ofetch';

type RevertFn<T> = (success: boolean, data: T | undefined) => Promise<void>;

type SubmitOpts<T> = {
  revert: RevertFn<T>;
  successMsg?: string;
  noSuccessToast?: boolean;
};

type Body = Record<string, unknown> | null | undefined;

export function useSubmit<T, Input = Body>(
  fetcher: (data: Input) => Promise<T>,
  opts: SubmitOpts<T>
) {
  const toast = useToast();

  return async (data: Input) => {
    try {
      const res = await fetcher(data);

      if (!opts.noSuccessToast) {
        toast.showToast({
          type: 'success',
          message: opts.successMsg,
        });
      }

      await opts.revert(true, res);
    } catch (e) {
      if (e instanceof Error) {
        toast.showToast({
          type: 'error',
          message:
            e instanceof FetchError
              ? (e.data?.message ?? e.message)
              : e.message,
        });
      } else {
        console.error(e);
      }
      await opts.revert(false, undefined);
    }
  };
}
