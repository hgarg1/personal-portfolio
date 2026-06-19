require('dotenv').config();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting database seeding...');

  const email = 'garg.archie@gmail.com';
  const name = 'Harshit Garg';
  const rawPassword = 'portfolio2026!';
  
  // Hash the password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  // Check if the portfolio user already exists
  const existingUser = await prisma.portfolioUser.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`⚠️ User ${email} already exists. Updating password...`);
    await prisma.portfolioUser.update({
      where: { email },
      data: {
        password: passwordHash,
        name,
      },
    });
  } else {
    console.log(`👤 Creating default portfolio admin user: ${email}`);
    await prisma.portfolioUser.create({
      data: {
        email,
        name,
        password: passwordHash,
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
