import { and, eq } from 'drizzle-orm';

import { user } from './schema';

import type { DBExecutor } from '#db/types';
import type { OAuthProvider } from '#shared/contracts/identity';

export class UserRepository {
  constructor(private readonly db: DBExecutor) {}

  async get(id: number) {
    return this.db.query.user.findFirst({ where: eq(user.id, id) });
  }

  async getByUsername(username: string) {
    return this.db.query.user.findFirst({ where: eq(user.username, username) });
  }

  async getByEmail(email: string) {
    return this.db.query.user.findFirst({ where: eq(user.email, email) });
  }

  async getByOAuth(provider: OAuthProvider, oauthId: string) {
    return this.db.query.user.findFirst({
      where: and(eq(user.oauthProvider, provider), eq(user.oauthId, oauthId)),
    });
  }

  async count() {
    return this.db.$count(user);
  }

  async insert(data: typeof user.$inferInsert) {
    return this.db.insert(user).values(data).returning();
  }

  async update(id: number, data: Partial<typeof user.$inferInsert>) {
    return this.db.update(user).set(data).where(eq(user.id, id));
  }
}
