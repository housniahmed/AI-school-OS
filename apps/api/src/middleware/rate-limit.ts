import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../infra/redis.js';

const redisStore = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.sendCommand(args)
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'api',
  store: redisStore,
  skip: (req) => req.path.startsWith('/health')
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'auth-login',
  store: redisStore
});
