import { Secret, TOTP } from 'otpauth';
import { UserUpdateTotpSchema } from '#db/repositories/user/types';

type Response =
  | {
      success: boolean;
      type: 'setup';
      key: string;
      uri: string;
    }
  | { success: boolean; type: 'created' }
  | { success: boolean; type: 'deleted' };

export default definePermissionEventHandler(
  'me',
  'update',
  async ({ event, user, checkPermissions }) => {
    const body = await readValidatedBody(
      event,
      validateZod(UserUpdateTotpSchema, event)
    );

    checkPermissions(user);

    if (body.type === 'setup') {
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
        type: 'setup',
        key: key.base32,
        uri: totp.toString(),
      } as Response;
    } else if (body.type === 'create') {
      await Database.users.verifyTotp(user.id, body.code);

      return {
        success: true,
        type: 'created',
      } as Response;
    } else if (body.type === 'delete') {
      await Database.users.deleteTotpKey(user.id, body.currentPassword);

      return {
        success: true,
        type: 'deleted',
      } as Response;
    }
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
    });
  }
);
