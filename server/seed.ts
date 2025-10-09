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

  console.log('Seeding manager accounts...');

  for (const account of managerAccounts) {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, account.username))
      .limit(1);
    
    if (existingUser.length > 0) {
      // Update existing user
      await db
        .update(users)
        .set({
          passwordHash,
          requiresPasswordChange: true,
        })
        .where(eq(users.username, account.username));
      console.log(`✓ Reset password for ${account.username} (${account.fullName})`);
    } else {
      // Insert new user
      await db.insert(users).values({
        username: account.username,
        fullName: account.fullName,
        role: account.role,
        passwordHash,
        requiresPasswordChange: true,
      });
      console.log(`✓ Created user ${account.username} (${account.fullName})`);
    }
  }

  console.log('\nAll manager accounts ready with password: Welcome2024!');
  console.log('Users must change their password on first login.');
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
