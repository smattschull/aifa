import 'dotenv/config';
import { syncRoleUsersWithEnv } from '../app/@left/(_public)/(_AUTH)/(_service)/(_libs)/sync-role-users';

(async () => {
  try {
    await syncRoleUsersWithEnv();
    console.log('syncRoleUsersWithEnv completed');
    process.exit(0);
  } catch (err) {
    console.error('sync failed', err);
    process.exit(1);
  }
})();
