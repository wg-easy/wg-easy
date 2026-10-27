import { hashPassword } from '#server/utils/password';
import type { DatabaseStore } from '#db/store';

/** Trusted local recovery entry point, available without a web session. */
export async function resetAdministrator(
  store: DatabaseStore,
  password: string
) {
  if (password.length < 12)
    throw new Error('Password must be at least 12 characters long');
  const hash = await hashPassword(password);
  return store.transaction(async ({ users }) => {
    const user = await users.get(1);
    if (!user) return undefined;
    await users.update(user.id, {
      password: hash,
      totpVerified: false,
      totpKey: null,
    });
    return { id: user.id, username: user.username };
  });
}
