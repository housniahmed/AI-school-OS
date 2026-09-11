import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(24).default('dev-only-change-this-secret-please'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(8).default(4)
});

export const env = schema.parse(process.env);
