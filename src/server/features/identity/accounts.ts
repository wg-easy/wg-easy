import { hashPassword } from '#server/utils/password';
import type { UserRepository } from '#db/repositories/user/repository';
import { roles } from '#shared/utils/permissions';

/** Used inside the setup transaction, including assignment of the first role. */
export async function createPasswordUser(
  users: UserRepository,
  username: string,
  password: string
) {
  const hash = await hashPassword(password);
  if (await users.getByUsername(username))
    throw new Error('User already exists');
  const count = await users.count();
  await users.insert({
    username,
    password: hash,
    email: null,
    name: 'Administrator',
    role: count === 0 ? roles.ADMIN : roles.CLIENT,
    totpVerified: false,
    enabled: true,
  });
}
