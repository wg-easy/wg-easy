export type ToastTypes = 'error' | 'success';
export type ToastParams = {
  type: ToastTypes;
  title: string;
  message: string;
};

export type OAUTH_PROVIDER = 'google' | 'github' | 'oidc';
