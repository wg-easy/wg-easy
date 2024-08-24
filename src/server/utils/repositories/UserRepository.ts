import type User from '@/server/databases/entities/user';
import type { UserProvider } from '@/server/databases/entities/user';
import type { Undefined } from '@/server/databases/database';

class UserRepository {
  newUser(db: UserProvider): Promise<User | Undefined> {
    return db.getUser('');
  }
}

export default new UserRepository();
