import 'dotenv/config';
import { z } from 'zod';
import { validateProductionConfig } from './production.js';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(24).default('dev-only-change-this-secret-please'),
  SECRETS_PROVIDER: z.enum(['env', 'external']).default('env'),
  SECRETS_NAMESPACE: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.6-luna'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(8).default(4),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

export const env = schema.parse(process.env);
validateProductionConfig({
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  secretsProvider: env.SECRETS_PROVIDER,
  secretsNamespace: env.SECRETS_NAMESPACE
});
