import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedUsers() {
  console.log("Seeding manager accounts...");
  
  const defaultPassword = "Welcome2024!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  const managerAccounts = [
    {
      username: "nbey",
      email: "nbey@queencityelite.com",
      passwordHash,
      fullName: "Nasire Bey",
      role: "admin" as const,
      requiresPasswordChange: true
    },
    {
      username: "vkelley",
      email: "vkelley@queencityelite.com",
      passwordHash,
      fullName: "Vince Kelley",
      role: "manager" as const,
      requiresPasswordChange: true
    },
    {
      username: "htownes",
      email: "htownes@queencityelite.com",
      passwordHash,
      fullName: "Harlander Townes",
      role: "manager" as const,
      requiresPasswordChange: true
    },
    {
      username: "rsaunders",
      email: "rsaunders@queencityelite.com",
      passwordHash,
      fullName: "Robin Saunders",
      role: "manager" as const,
      requiresPasswordChange: true
    },
    {
      username: "kturner",
      email: "kturner@queencityelite.com",
      passwordHash,
      fullName: "Katrina Turner",
      role: "manager" as const,
      requiresPasswordChange: true
    }
  ];

  try {
    for (const account of managerAccounts) {
      // Check if user already exists
      const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, account.username)
      });

      if (!existing) {
        await db.insert(users).values(account);
        console.log(`✓ Created user: ${account.username} (${account.fullName})`);
      } else {
        // Update existing user with email if not set
        if (!existing.email) {
          await db.update(users)
            .set({ email: account.email })
            .where(eq(users.username, account.username));
          console.log(`✓ Updated user with email: ${account.username} (${account.email})`);
        } else {
          console.log(`- User already exists: ${account.username}`);
        }
      }
    }
    
    console.log("\n✅ Manager accounts seeded successfully!");
    console.log("Default password for all accounts: Welcome2024!");
    console.log("Users will be required to change password on first login.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

seedUsers();
