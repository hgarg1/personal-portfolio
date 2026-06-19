const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Create pg connection pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the Prisma Pg adapter
const adapter = new PrismaPg(pool);

// Instantiate the Prisma Client using the adapter
const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
