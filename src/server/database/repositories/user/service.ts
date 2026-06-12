import { eq, sql, and } from 'drizzle-orm';
import { TOTP } from 'otpauth';
import { user } from './schema';
import type { UserType } from './types';
import type { DBType } from '#db/sqlite';

type LoginResult =
  | {
      success: true;
      user: UserType;
    }
  | {
      success: false;
      error:
        | 'INCORRECT_CREDENTIALS'
        | 'USER_DISABLED'
        | 'INVALID_TOTP_CODE'
        | 'UNEXPECTED_ERROR';
    }
  | {
      success: false;
      error: 'TOTP_REQUIRED';
      userId: ID;
    };

type LoginWithOAuthResult =
  | {
      success: true;
      user: UserType;
    }
  | {
      success: false;
      error:
        | 'USER_DISABLED'
        | 'USER_ALREADY_LINKED'
        | 'UNEXPECTED_ERROR'
        | 'AUTO_REGISTER_DISABLED';
    }
  | {
      success: false;
      error: 'TOTP_REQUIRED';
      userId: ID;
    };

function createPreparedStatement(db: DBType) {
  return {
    findAll: db.query.user.findMany().prepare(),
    findById: db.query.user
      .findFirst({ where: eq(user.id, sql.placeholder('id')) })
      .prepare(),
    findByUsername: db.query.user
      .findFirst({
        where: eq(user.username, sql.placeholder('username')),
      })
      .prepare(),
    update: db
      .update(user)
      .set({
        name: sql.placeholder('name') as never as string,
        email: sql.placeholder('email') as never as string,
      })
      .where(eq(user.id, sql.placeholder('id')))
      .prepare(),
    updateKey: db
      .update(user)
      .set({
        totpKey: sql.placeholder('key') as never as string,
        totpVerified: false,
      })
      .where(eq(user.id, sql.placeholder('id')))
      .prepare(),
  };
}

export class UserService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  #createTotp(user: { username: string; totpKey: string }) {
    return new TOTP({
      issuer: 'wg-easy',
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: user.totpKey,
    });
  }

  async getAll() {
    return this.#statements.findAll.execute();
  }

  async get(id: ID) {
    return this.#statements.findById.execute({ id });
  }

  async getByUsername(username: string) {
    return this.#statements.findByUsername.execute({ username });
  }

  async create(username: string, password: string) {
    const hash = await hashPassword(password);

    return this.#db.transaction(async (tx) => {
      const oldUser = await tx.query.user
        .findFirst({
          where: eq(user.username, username),
        })
        .execute();

      if (oldUser) {
        throw new Error('User already exists');
      }

      const userCount = await tx.$count(user);

      await tx.insert(user).values({
        password: hash,
        username,
        email: null,
        name: 'Administrator',
        role: userCount === 0 ? roles.ADMIN : roles.CLIENT,
        totpVerified: false,
        enabled: true,
      });
    });
  }

  async update(id: ID, name: string, email: string | null) {
    return this.#statements.update.execute({ id, name, email });
  }

  async updatePassword(
    id: ID,
    currentPassword: string | null,
    newPassword: string
  ) {
    const hash = await hashPassword(newPassword);

    return this.#db.transaction(async (tx) => {
      // get user again to avoid password changing while request
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.id, id) })
        .execute();

      if (!txUser) {
        throw new Error('User not found');
      }

      // only check password if already set
      if (txUser.password !== null) {
        if (!currentPassword) {
          throw new Error('Invalid password');
        }

        const passwordValid = await isPasswordValid(
          currentPassword,
          txUser.password
        );

        if (!passwordValid) {
          throw new Error('Invalid password');
        }
      }

      await tx
        .update(user)
        .set({ password: hash })
        .where(eq(user.id, id))
        .execute();
    });
  }

  updateTotpKey(id: ID, key: string | null) {
    return this.#statements.updateKey.execute({ id, key });
  }

  login(username: string, password: string) {
    return this.#db.transaction(async (tx): Promise<LoginResult> => {
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.username, username) })
        .execute();

      // always check to avoid timing attack
      const userHashPassword = txUser?.password ?? null;
      const passwordValid = await isPasswordValid(password, userHashPassword);

      if (!txUser || !passwordValid) {
        return { success: false, error: 'INCORRECT_CREDENTIALS' };
      }

      if (!txUser.enabled) {
        return { success: false, error: 'USER_DISABLED' };
      }

      if (txUser.totpVerified) {
        return {
          success: false,
          error: 'TOTP_REQUIRED',
          userId: txUser.id,
        };
      }

      return { success: true, user: txUser };
    });
  }

  verifyTotp(id: ID, code: string) {
    return this.#db.transaction(async (tx) => {
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.id, id) })
        .execute();

      if (!txUser) {
        throw new Error('User not found');
      }

      const totpKey = txUser.totpKey;
      if (!totpKey) {
        throw new Error('TOTP key is not set');
      }

      const totp = this.#createTotp({ username: txUser.username, totpKey });
      if (totp.validate({ token: code, window: 1 }) === null) {
        throw new Error('Invalid TOTP code');
      }

      await tx
        .update(user)
        .set({ totpVerified: true })
        .where(eq(user.id, id))
        .execute();
    });
  }

  deleteTotpKey(id: ID, currentPassword: string) {
    return this.#db.transaction(async (tx) => {
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.id, id) })
        .execute();

      if (!txUser) {
        throw new Error('User not found');
      }

      const passwordValid = await isPasswordValid(
        currentPassword,
        txUser.password
      );

      if (!passwordValid) {
        throw new Error('Invalid password');
      }

      await tx
        .update(user)
        .set({ totpKey: null, totpVerified: false })
        .where(eq(user.id, id))
        .execute();
    });
  }

  async validateTotpCode(id: ID, code: string) {
    const txUser = await this.#db.query.user
      .findFirst({ where: eq(user.id, id) })
      .execute();

    if (!txUser || !txUser.totpVerified || !txUser.totpKey) {
      return 'INVALID_TOTP_CODE' as const;
    }

    const totp = this.#createTotp({
      username: txUser.username,
      totpKey: txUser.totpKey,
    });
    const isValid = totp.validate({ token: code, window: 1 }) !== null;

    if (!isValid) {
      return 'INVALID_TOTP_CODE' as const;
    }

    if (!txUser.enabled) {
      return 'USER_DISABLED' as const;
    }

    return 'success' as const;
  }

  /**
   * Login or register user with OAuth provider.
   * If user with the same email already exists, link account with OAuth provider.
   * Otherwise, create new user.
   */
  async loginWithOAuth(
    provider: OAUTH_PROVIDER,
    oauthId: string,
    username: string,
    email: string,
    name: string
  ): Promise<LoginWithOAuthResult> {
    return this.#db.transaction(async (tx) => {
      const userById = await tx.query.user
        .findFirst({
          where: and(
            eq(user.oauthProvider, provider),
            eq(user.oauthId, oauthId)
          ),
        })
        .execute();

      if (userById) {
        if (!userById.enabled) {
          return { success: false, error: 'USER_DISABLED' };
        }
        if (userById.totpVerified) {
          return {
            success: false,
            error: 'TOTP_REQUIRED',
            userId: userById.id,
          };
        }
        return { success: true, user: userById };
      }

      const userByEmail = await tx.query.user
        .findFirst({
          where: eq(user.email, email),
        })
        .execute();

      if (userByEmail) {
        if (!userByEmail.enabled) {
          return { success: false, error: 'USER_DISABLED' };
        }
        if (userByEmail.oauthProvider && userByEmail.oauthId) {
          return {
            success: false,
            error: 'USER_ALREADY_LINKED',
          };
        }

        await tx
          .update(user)
          .set({ oauthProvider: provider, oauthId: oauthId })
          .where(eq(user.id, userByEmail.id))
          .execute();

        if (userByEmail.totpVerified) {
          return {
            success: false,
            error: 'TOTP_REQUIRED',
            userId: userByEmail.id,
          };
        }

        // TODO: return updated user
        return { success: true, user: userByEmail };
      }

      if (!WG_ENV.OAUTH_AUTO_REGISTER) {
        return { success: false, error: 'AUTO_REGISTER_DISABLED' };
      }

      // Create new user
      const newUsers = await tx
        .insert(user)
        .values({
          username,
          password: null,
          email,
          name,
          role: roles.ADMIN,
          totpVerified: false,
          enabled: true,
          oauthProvider: provider,
          oauthId,
        })
        .returning();
      const newUser = newUsers[0];

      if (!newUser) {
        return { success: false as const, error: 'UNEXPECTED_ERROR' as const };
      }
      return { success: true as const, user: newUser };
    });
  }

  unlinkOauth(id: ID) {
    return this.#db.transaction(async (tx) => {
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.id, id) })
        .execute();

      if (!txUser) {
        throw new Error('User not found');
      }

      // can't unlink if no way to log back in
      if (!txUser.password) {
        throw new Error('Password login not enabled');
      }

      await tx
        .update(user)
        .set({ oauthProvider: null, oauthId: null })
        .where(eq(user.id, id))
        .execute();
    });
  }

  async linkOauth(id: ID, provider: OAUTH_PROVIDER, oauthId: string) {
    return this.#db.transaction(async (tx) => {
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.id, id) })
        .execute();

      if (!txUser) {
        throw new Error('User not found');
      }

      if (txUser.oauthProvider || txUser.oauthId) {
        throw new Error('User already linked with an OAuth provider');
      }

      const existingUser = await tx.query.user
        .findFirst({
          where: and(
            eq(user.oauthProvider, provider),
            eq(user.oauthId, oauthId)
          ),
        })
        .execute();

      if (existingUser) {
        throw new Error('OAuth account already linked with another user');
      }

      await tx
        .update(user)
        .set({ oauthProvider: provider, oauthId: oauthId })
        .where(eq(user.id, id))
        .execute();
    });
  }
}
