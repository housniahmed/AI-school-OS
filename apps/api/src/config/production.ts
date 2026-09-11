export type RuntimeConfig = {
  nodeEnv?: string;
  jwtSecret: string;
};

const INSECURE_DEFAULTS = new Set([
  'dev-only-change-this-secret-please',
  'change-me-with-at-least-24-characters'
]);

export function validateProductionConfig(config: RuntimeConfig): void {
  if (config.nodeEnv !== 'production') return;

  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }

  if (INSECURE_DEFAULTS.has(config.jwtSecret)) {
    throw new Error('JWT_SECRET must be replaced before production deployment');
  }
}
