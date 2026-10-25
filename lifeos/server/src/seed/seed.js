'use strict';

// Seed: provisions the single OWNER account set in .env (OWNER_EMAIL /
// OWNER_NAME / OWNER_PASSWORD). No sample data, no demo users — LifeOS is a
// private single-account installation. Any other account found in the
// database (and its data) is removed. Idempotent: the owner (and their
// password, once they've reset it) is never touched if it already exists.

require('dotenv').config();

const env = require('../config/env');
const { connectDb, disconnectDb } = require('../config/db');
const User = require('../models/User');
const LifeArea = require('../models/LifeArea');
const Vision = require('../models/Vision');
const Assessment = require('../models/Assessment');
const Goal = require('../models/Goal');
const Milestone = require('../models/Milestone');
const Decision = require('../models/Decision');
const Notification = require('../models/Notification');
const Token = require('../models/Token');
const Upload = require('../models/Upload');
const userService = require('../services/user.service');
const { hashPassword } = require('../utils/crypto');
const storage = require('../utils/storage');

async function removeOtherUsers() {
  if (!env.OWNER_EMAIL) {
    console.log('[seed] no owner email configured — nothing to remove');
    return;
  }
  const stale = await User.find({ email: { $ne: env.OWNER_EMAIL } }).lean();
  for (const user of stale) {
    console.log(`[seed] removing account (not the owner): ${user.email}`);
    const uploads = await Upload.find({ userId: user._id }).select('storageKey').lean();
    await Promise.all([
      User.deleteOne({ _id: user._id }),
      Token.deleteMany({ userId: user._id }),
      LifeArea.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      Vision.deleteMany({ userId: user._id }),
      Assessment.deleteMany({ userId: user._id }),
      Goal.deleteMany({ userId: user._id }),
      Milestone.deleteMany({ userId: user._id }),
      Decision.deleteMany({ userId: user._id }),
      Upload.deleteMany({ userId: user._id }),
      ...uploads.map((u) => storage.deleteObject(u.storageKey)),
    ]);
  }
}

async function ensureOwner() {
  if (!env.OWNER_EMAIL || !env.OWNER_PASSWORD) {
    console.log('[seed] OWNER_EMAIL / OWNER_PASSWORD not set — skipping owner provisioning');
    console.log('       set them in server/.env (they never leave this machine)');
    return;
  }

  const owner = await User.findOne({ email: env.OWNER_EMAIL });
  if (owner) {
    console.log(`[seed] owner exists: ${owner.email} — password left untouched`);
  } else {
    await userService.provisionUser({
      name: env.OWNER_NAME || 'Owner',
      email: env.OWNER_EMAIL,
      password: env.OWNER_PASSWORD,
    });
    console.log(`[seed] created owner account: ${env.OWNER_EMAIL}`);
  }
}

async function main() {
  await connectDb();
  await removeOtherUsers();
  await ensureOwner();

  if (env.INITIAL_ADMIN_EMAIL && env.INITIAL_ADMIN_PASSWORD) {
    await userService.provisionUser({
      email: env.INITIAL_ADMIN_EMAIL,
      name: 'LifeOS Admin',
      password: env.INITIAL_ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log(`[seed] admin bootstrap: ${env.INITIAL_ADMIN_EMAIL}`);
  }

  console.log('\n[seed] Sign in with the OWNER_EMAIL / OWNER_PASSWORD from server/.env\n');
  await disconnectDb();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
