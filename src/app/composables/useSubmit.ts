import { FetchError } from 'ofetch';

type SubmitResponse = {
  status?: string;
  type?: string;
  uri?: string;
  key?: string;
};

type SubmitOptions = {
  method: 'post' | 'delete' | 'put' | 'patch';
};

type SubmitFetch = (
  request: string,
  options: SubmitOptions & { body: unknown }
) => Promise<SubmitResponse>;

type RevertFn = (
  success: boolean,
  data: SubmitResponse | undefined
) => Promise<void>;

type SubmitOpts = {
  revert: RevertFn;
  successMsg?: string;
  noSuccessToast?: boolean;
};

export function useSubmit(
  url: string,
  options: SubmitOptions,
  opts: SubmitOpts
) {
  const toast = useToast();

  return async (data: unknown) => {
    try {
      const res = await ($fetch as SubmitFetch)(url, {
        ...options,
        body: data,
      });

      if (!opts.noSuccessToast) {
        toast.showToast({
          type: 'success',
          message: opts.successMsg,
        });
      }

      await opts.revert(true, res);
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
