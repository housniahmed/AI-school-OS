import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { sendRedisCommand } from '../infra/redis.js';

function createRedisStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) => sendRedisCommand(...args)
  });
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'api',
  store: createRedisStore('ai-school-os:ratelimit:api:'),
  skip: (req) => req.path.startsWith('/health')
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'auth-login',
  store: createRedisStore('ai-school-os:ratelimit:auth:')
});
