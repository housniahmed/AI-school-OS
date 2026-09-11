import { createClient } from 'redis';
import { env } from '../config/env.js';

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(1000 * 2 ** Math.min(retries, 5), 30000)
  }
});

redisClient.on('error', (error) => {
  console.error(JSON.stringify({ event: 'redis.error', message: error.message }));
});

redisClient.on('reconnecting', () => {
  console.warn(JSON.stringify({ event: 'redis.reconnecting' }));
});

let connectPromise: Promise<void> | undefined;

export async function connectRedis() {
  if (redisClient.isReady) return;
  connectPromise ??= redisClient.connect().then(() => undefined).finally(() => {
    connectPromise = undefined;
  });
  await connectPromise;
}

export async function disconnectRedis() {
  if (redisClient.isOpen) await redisClient.quit();
}

export async function sendRedisCommand(...args: string[]) {
  await connectRedis();
  return redisClient.sendCommand(args);
}
