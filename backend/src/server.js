import { createApp } from './app.js';
import env from './config/env.js';
import { closePool, waitForDatabase } from './db/pool.js';
import { runMigrations } from './db/migrate.js';

async function start() {
  try {
    await waitForDatabase();
    await runMigrations();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('✖ could not initialise the database:', err.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    // Force-exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
