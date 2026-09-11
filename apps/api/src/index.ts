import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { connectRedis, disconnectRedis } from './infra/redis.js';

async function start() {
  await connectRedis();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(JSON.stringify({ event: 'server.started', port: env.PORT, nodeEnv: env.NODE_ENV }));
  });

  const shutdown = async (signal: string) => {
    console.info(JSON.stringify({ event: 'server.shutdown_started', signal }));
    server.close(async () => {
      await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
      console.info(JSON.stringify({ event: 'server.shutdown_completed' }));
      process.exit(0);
    });

    setTimeout(() => {
      console.error(JSON.stringify({ event: 'server.shutdown_timeout' }));
      process.exit(1);
    }, 10000).unref();
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

start().catch(async (error) => {
  console.error(JSON.stringify({ event: 'server.start_failed', error: error instanceof Error ? error.message : String(error) }));
  await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
  process.exit(1);
});
