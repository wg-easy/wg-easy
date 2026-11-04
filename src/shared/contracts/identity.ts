export type BrandedRole = { readonly __role: unique symbol };
export type Role = number & BrandedRole;
export type Actor = { id: number; role: Role };
export type OAuthProvider = 'google' | 'github' | 'oidc';

export type PublicUser = Actor & {
  username: string;
  name: string;
  email: string | null;
  totpVerified: boolean;
  oauthProvider: OAuthProvider | null;
  hasPassword: boolean;
};

export type PendingLogin = {
  type: 'password' | 'oauth';
  userId: number;
  remember: boolean;
  /** Milliseconds since the Unix epoch. */
  expires_at: number;
};
