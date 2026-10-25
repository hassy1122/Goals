'use strict';

require('dotenv').config();

const env = require('./config/env');
const { connectDb, disconnectDb } = require('./config/db');
const { createApp } = require('./app');

async function main() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[api] LifeOS API on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[api] Docs: http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received — shutting down`);
    server.close();
    await disconnectDb().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[api] Fatal startup failure:', err);
  process.exit(1);
});
