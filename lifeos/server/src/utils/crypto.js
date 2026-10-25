'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('hex');

// Tokens are stored hashed, so a database leak cannot yield usable session/forgot tokens.
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

const hashPassword = (plain) => bcrypt.hash(plain, 12);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { randomToken, hashToken, hashPassword, verifyPassword };
