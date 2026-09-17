import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { connectRedis, disconnectRedis } from './infra/redis.js';
import { shutdownTelemetry } from './instrumentation.js';

async function start() {
  await connectRedis();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(JSON.stringify({ event: 'server.started', port: env.PORT, nodeEnv: env.NODE_ENV }));
  });

  const shutdown = async (signal: string) => {
    console.info(JSON.stringify({ event: 'server.shutdown_started', signal }));
    server.close(async () => {
      await Promise.allSettled([prisma.$disconnect(), disconnectRedis(), shutdownTelemetry()]);
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
  console.error(JSON.stringify({ event: 'server.start_failed', errorType: error instanceof Error ? error.name : 'UnknownError' }));
  await Promise.allSettled([prisma.$disconnect(), disconnectRedis(), shutdownTelemetry()]);
  process.exit(1);
});
