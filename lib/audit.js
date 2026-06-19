const prismaLocal = require('./prisma');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const PROD_DB_URL = "postgres://444679d3a6ffb59100eec96feac1eba1ca1033885ec7dc345d3b2c87e214d646:sk_56f91UwRcEozEcxn7wrDD@db.prisma.io:5432/postgres?sslmode=require";

// Create pg connection pool pointing to production database
const prodPool = new Pool({
  connectionString: PROD_DB_URL,
});

// Create Prisma Pg adapter for production connection
const prodAdapter = new PrismaPg(prodPool);

// Instantiate the production Prisma client using the adapter
const prismaProd = new PrismaClient({
  adapter: prodAdapter,
});

/**
 * Logs an administrative action to both the local and production databases.
 */
async function logAction({
  action,
  details,
  actorId,
  actorEmail,
  targetId,
  targetEmail
}) {
  const logData = {
    action,
    details: typeof details === 'object' ? JSON.stringify(details) : details,
    actorId,
    actorEmail,
    targetId,
    targetEmail
  };

  // 1. Write to local database
  try {
    await prismaLocal.auditLog.create({
      data: logData
    });
    console.log(`[AuditLog] Logged local action: ${action}`);
  } catch (err) {
    console.error('❌ Failed to write audit log to local database:', err);
  }

  // 2. Write to production database asynchronously to prevent UI block on slow connection
  prismaProd.auditLog.create({
    data: logData
  }).then(() => {
    console.log(`[AuditLog] Logged production action: ${action}`);
  }).catch((err) => {
    console.error('❌ Failed to write audit log to production database:', err);
  });
}

module.exports = {
  logAction
};
