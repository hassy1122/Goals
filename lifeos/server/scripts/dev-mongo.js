'use strict';

// Dev helper: serves MongoDB on MONGODB_URI's port using mongodb-memory-server
// so the API + seed work without a local mongod install.
//   npm run dev:mongo
// Note: data is in-memory — it resets when this process stops. For persistence,
// install MongoDB (or use Atlas) and point MONGODB_URI at it instead.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const server = await MongoMemoryServer.create({
    instance: { port: 27017, ip: '127.0.0.1', dbName: 'lifeos' },
  });
  console.log(`[dev-mongo] MongoDB ready at ${server.getUri('lifeos')}`);
  console.log('[dev-mongo] In-memory only — data resets when this process exits.');

  const shutdown = async () => {
    console.log('[dev-mongo] Stopping…');
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev-mongo] failed:', err.message);
  process.exit(1);
});
