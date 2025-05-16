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

    const type = body.type;

    checkPermissions(user);

    switch (type) {
      case 'setup': {
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
      }
      case 'create': {
        await Database.users.verifyTotp(user.id, body.code);

        return {
          success: true,
          type: 'created',
        } as Response;
      }
      case 'delete': {
        await Database.users.deleteTotpKey(user.id, body.currentPassword);

        return {
          success: true,
          type: 'deleted',
        } as Response;
      }
    }
    assertUnreachable(type);
  }
);
