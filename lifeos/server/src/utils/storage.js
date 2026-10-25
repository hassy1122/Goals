'use strict';

const fs = require('fs');
const path = require('path');
require('crypto');
const { badRequest } = require('./apiError');

// Local-disk storage driver. The public surface (putObject / getObjectStream /
// deleteObject) is S3-ready: swap these three functions for an SDK in Phase 7
// without touching controllers.
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

const EXT_FOR_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

function extForMime(mime) {
  return EXT_FOR_MIME[mime] || '';
}

// Keys are always generated here, but never trust them blindly on read.
function resolveKey(key) {
  const clean = String(key).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.includes('..') || clean.startsWith('/')) {
    throw badRequest('Invalid storage key.', 'INVALID_KEY');
  }
  const abs = path.join(UPLOAD_ROOT, clean);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep) && abs !== UPLOAD_ROOT) {
    throw badRequest('Invalid storage key.', 'INVALID_KEY');
  }
  return abs;
}

async function putObject(userId, buffer, mimeType) {
  const ext = extForMime(mimeType);
  const key = `${userId}/${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}${ext}`;
  const abs = resolveKey(key);
  await fs.promises.mkdir(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
  return key;
}

async function getObjectStream(key) {
  const abs = resolveKey(key);
  return fs.createReadStream(abs);
}

async function deleteObject(key) {
  await fs.promises.rm(path.join(UPLOAD_ROOT, String(key)), { force: true });
}

module.exports = { UPLOAD_ROOT, extForMime, putObject, getObjectStream, deleteObject };
