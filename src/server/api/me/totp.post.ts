import { Secret, TOTP } from 'otpauth';
import { UserUpdateTotpSchema } from '#db/repositories/user/types';

type Response =
  | {
      success: boolean;
      type: 'create';
      key: string;
      uri: string;
    }
  | {
      success: boolean;
      type: 'created';
    };

export default definePermissionEventHandler(
  'me',
  'update',
  async ({ event, user, checkPermissions }) => {
    const { code } = await readValidatedBody(
      event,
      validateZod(UserUpdateTotpSchema, event)
    );

    checkPermissions(user);

    if (!code) {
      const key = new Secret({ size: 20 });

      const totp = new TOTP({
        issuer: 'wg-easy',
        label: user.username,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: key,
      });

      await Database.users.updateTotpKey(user.id, key.base32);

      return {
        success: true,
        type: 'create',
        key: key.base32,
        uri: totp.toString(),
      } as Response;
    } else {
      await Database.users.verifyTotp(user.id, code);

      return {
        success: true,
        type: 'created',
      } as Response;
    }
  }
);
