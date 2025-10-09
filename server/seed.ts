import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedUsers() {
  const defaultPassword = 'Welcome2024!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const managerAccounts = [
    { username: 'nbey', fullName: 'Nasire Bey', role: 'admin' as const },
    { username: 'vkelley', fullName: 'Vince Kelley', role: 'manager' as const },
    { username: 'htownes', fullName: 'Harlander Townes', role: 'manager' as const },
    { username: 'rsaunders', fullName: 'Robin Saunders', role: 'manager' as const },
    { username: 'kturner', fullName: 'Katrina Turner', role: 'manager' as const },
  ];

  console.log('Resetting manager account passwords to Welcome2024!...');

  for (const account of managerAccounts) {
    await db
      .update(users)
      .set({
        passwordHash,
        requiresPasswordChange: true,
      })
      .where(eq(users.username, account.username));
    
    console.log(`✓ Reset password for ${account.username} (${account.fullName})`);
  }

  console.log('\nAll manager passwords have been reset to: Welcome2024!');
  console.log('Users must change their password on first login.');
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
