import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { users } from './schema';

// Load environment variables explicitly
config({ path: '.env.local' });

// Initialize DB
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

async function seedUsers() {
  const plainUsers = [
    {
      fullName: 'Joe Daulayan',
      email: 'joedaulayan.4@gmail.com',
      password: 'Testing.1',
      role: 'Admin' as const,
    },
    {
      fullName: 'Ian Tristan Landagura',
      email: 'iantristanlandagura21@gmail.com',
      password: 'Testing.1',
      role: 'Admin' as const,
    },
    {
      fullName: 'Kathlene Claire Feliciano',
      email: 'kathleneclairefeliciano24@gmail.com',
      password: 'Testing.1',
      role: 'Admin' as const,
    },
    {
      fullName: 'Krystel Kate Dulnuan',
      email: 'krysteldulnuan@gmail.com',
      password: 'Testing.1',
      role: 'Admin' as const,
    },
  ];

  const hashedUsers = await Promise.all(
    plainUsers.map(async (user) => ({
      ...user,
      password: await bcrypt.hash(user.password, 10),
      isActive: true,
      pharmacyId: 1,
    })),
  );

  const result = await db.insert(users).values(hashedUsers).returning();

  console.log(`✅ Seeded ${result.length} users:\n`);
  result.forEach((user, i) => {
    console.log(`${i + 1}. ${user.fullName} (${user.email}) - ${user.role}`);
  });

  await pool.end();
  console.log('\n🔌 Database connection closed');
}

seedUsers()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
