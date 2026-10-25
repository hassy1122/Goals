'use strict';

// One-command launcher for LifeOS:
//   1) MongoDB (persistent — data lives in server/.data/db, survives restarts)
//   2) Demo seed (first run only, or when the data folder is deleted)
//   3) API server + web app (Vite)
//   4) Opens the browser automatically
//
// Run via `Start LifeOS.bat` in the repo root, or: npm run start:all

const { spawn, spawnSync, execSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..');
const CLIENT_DIR = path.join(SERVER_DIR, '..', 'client');
const DATA_DIR = path.join(SERVER_DIR, '.data');
const DB_DIR = path.join(DATA_DIR, 'db');
const PID_FILE = path.join(DATA_DIR, 'mongo.pid');

const MONGO_PORT = Number(process.env.MONGO_PORT || 27017);
const API_PORT = Number(process.env.PORT || 4000);
const WEB_URL_DEFAULT = 'http://localhost:5173';

const children = new Set();
let shuttingDown = false;

const log = (tag, msg) => console.log(`[${tag}] ${msg}`);

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs, what) {
  for (let waited = 0; waited < timeoutMs; waited += 400) {
    if (await portOpen(port)) return;
    await sleep(400);
  }
  throw new Error(`${what} did not open port ${port} within ${Math.round(timeoutMs / 1000)}s`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- MongoDB (persistent) ----------
function killStaleMongo() {
  try {
    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    if (pid) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        log('mongo', `stopped stale instance (pid ${pid})`);
      } catch {
        /* not running anymore */
      }
    }
    fs.unlinkSync(PID_FILE);
  } catch {
    /* no pid file */
  }
}

async function ensureMongo(wasFreshData) {
  if (await portOpen(MONGO_PORT)) {
    log('mongo', `already running on 127.0.0.1:${MONGO_PORT} — reusing it`);
    return;
  }
  if (wasFreshData) killStaleMongo();

  fs.mkdirSync(DB_DIR, { recursive: true });

  // Reuse the mongod binary already downloaded by the test suite.
  const { MongoBinary } = require('mongodb-memory-server');
  const binary = await MongoBinary.getPath();
  log('mongo', `starting ${path.basename(binary)}`);

  const child = spawn(
    binary,
    ['--dbpath', DB_DIR, '--port', String(MONGO_PORT), '--bind_ip', '127.0.0.1', '--quiet'],
    { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
  );
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => log('mongo:err', chunk.trim()));
  child.on('error', (err) => log('mongo', `failed to start: ${err.message}`));
  child.on('exit', (code) => {
    if (!shuttingDown) log('mongo', `stopped (code ${code ?? 'signal'})`);
  });

  children.add(child);
  fs.writeFileSync(PID_FILE, String(child.pid));

  await waitForPort(MONGO_PORT, 45000, 'MongoDB');
  log('mongo', `ready — data is persisted in ${DB_DIR}`);
}

// ---------- Demo seed (idempotent, first launch only) ----------
function seedIfNeeded(wasFreshData) {
  if (!wasFreshData) {
    log('seed', 'existing data found — skipping demo seed');
    return;
  }
  log('seed', 'first run — provisioning the owner account…');
  const result = spawnSync(process.execPath, ['src/seed/seed.js'], {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) log('seed', 'seed failed (see above) — continuing anyway');
}

// ---------- Generic child with tagged log lines ----------
function startProc(tag, command, procArgs, options = {}) {
  const child = spawn(command, procArgs, {
    ...options,
    env: { ...process.env, ...(options.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);

  const forward = (stream) => {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) if (line.trim()) log(tag, line);
    });
    stream.on('end', () => {
      if (buffer.trim()) log(tag, buffer.trim());
    });
  };
  forward(child.stdout);
  forward(child.stderr);

  child.on('exit', (code) => {
    if (!shuttingDown) {
      log(tag, `stopped (code ${code ?? 'signal'})`);
      shutdown('a component exited');
    }
  });
  return child;
}

// Wait until the given proc's stdout mentions its URL (Vite prints `Local: …`).
function waitForLine(proc, regex, timeoutMs, fallback) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      proc.stdout.off('data', onData);
      resolve(fallback);
    }, timeoutMs);
    const onData = (chunk) => {
      const match = String(chunk).match(regex);
      if (match) {
        clearTimeout(timer);
        proc.stdout.off('data', onData);
        resolve(match[1].replace(/\/$/, ''));
      }
    };
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', onData);
  });
}

const openBrowser = (url) => {
  try {
    execSync(`start "" "${url}"`, { shell: true, stdio: 'ignore' });
  } catch {
    log('lifeos', `open ${url} manually in your browser`);
  }
};

// ---------- Shutdown ----------
function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (reason) log('lifeos', `stopping everything (${reason})…`);
  for (const child of children) {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  }
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* no pid file */
  }
  setTimeout(() => process.exit(reason ? 1 : 0), 200).unref();
}

process.on('SIGINT', () => shutdown('Ctrl+C'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('window closed')); // console window X button
process.on('unhandledRejection', (err) => {
  console.error(err);
  shutdown('unhandled error');
});

// ---------- Main ----------
(async () => {
  console.log('============================================');
  console.log('  LifeOS — starting MongoDB, API, and web app');
  console.log('============================================');

  const wasFreshData = !fs.existsSync(DB_DIR); // checked before anything creates it

  await ensureMongo(wasFreshData);
  seedIfNeeded(wasFreshData);

  log('api', 'starting API server…');
  const api = startProc('api', process.execPath, ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { PORT: String(API_PORT), NODE_ENV: 'development' },
  });
  await waitForPort(API_PORT, 45000, 'API');
  log('api', `ready on http://localhost:${API_PORT} (Swagger docs: /api/docs)`);

  log('web', 'starting web app (Vite)…');
  // Run Vite directly with node — spawning npm.cmd on Windows requires a shell
  // and fails with ENOENT otherwise.
  const client = startProc('web', process.execPath, ['node_modules/vite/bin/vite.js', '--host'], {
    cwd: CLIENT_DIR,
    env: { BROWSER: 'none' },
  });
  const webUrl = await waitForLine(client, /Local:\s+(http:\/\/\S+?)\/?\s*\n/, 45000, WEB_URL_DEFAULT);

  log('lifeos', `web app at ${webUrl} — opening your browser…`);
  openBrowser(webUrl);

  log('lifeos', 'All running. Keep this window open; press Ctrl+C or close it to stop everything.');
})().catch((err) => {
  console.error(`[lifeos] startup failed: ${err && err.stack ? err.stack : err}`);
  shutdown('startup failure');
});
