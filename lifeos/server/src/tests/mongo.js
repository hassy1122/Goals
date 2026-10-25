'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDb } = require('../config/db');
const { createApp } = require('../app');

let server = null;

// Each test file gets an isolated in-memory MongoDB; the API app is built fresh for it.
async function startMongo() {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri('lifeos');
  await connectDb(process.env.MONGODB_URI);
  return createApp();
}

async function stopMongo() {
  await mongoose.disconnect();
  if (server) {
    await server.stop();
    server = null;
  }
}

// Between tests: drop the DB and rebuild indexes. dropDatabase destroys unique
// indexes (LifeArea collation, Notification dedupe, Goal template, Token hash,
// User email) and mongoose only builds them once per connection — without the
// re-sync later tests in a file would silently run with the uniqueness gone.
async function resetDb() {
  await mongoose.connection.dropDatabase();
  await Promise.all(mongoose.modelNames().map((name) => mongoose.models[name].syncIndexes()));
}

module.exports = { startMongo, stopMongo, resetDb };
