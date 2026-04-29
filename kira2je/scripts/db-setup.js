// Detects DATABASE_URL and runs the correct Prisma setup before next build.
// - file:  → SQLite schema + prisma db push  (local dev)
// - else   → PostgreSQL schema + prisma migrate deploy  (Vercel / cloud)
const { execSync } = require('child_process');
require('dotenv').config();

const url = process.env.DATABASE_URL ?? '';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

if (!url || url.startsWith('file:')) {
  console.log('[db-setup] SQLite detected');
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'file:./prisma/dev.db';
  run('npx prisma generate --schema=prisma/schema.sqlite.prisma');
  run('npx prisma db push --schema=prisma/schema.sqlite.prisma --accept-data-loss');
} else {
  console.log('[db-setup] PostgreSQL detected');
  run('npx prisma generate');
  run('npx prisma migrate deploy');
}
