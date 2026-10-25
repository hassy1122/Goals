'use strict';

const mongoose = require('mongoose');
const env = require('./env');

async function connectDb(uri = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  if (env.NODE_ENV !== 'test') console.log('[db] Connected to MongoDB');
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
