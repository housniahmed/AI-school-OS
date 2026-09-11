export type RuntimeConfig = {
  nodeEnv?: string;
  jwtSecret: string;
  secretsProvider?: string;
  secretsNamespace?: string;
  openAiApiKey?: string;
  externalAiProcessingAck?: boolean;
  metricsToken?: string;
};

const INSECURE_DEFAULTS = new Set([
  'dev-only-change-this-secret-please',
  'change-me-with-at-least-24-characters',
  'change-me-with-at-least-32-characters-for-local-use'
]);

export function validateProductionConfig(config: RuntimeConfig): void {
  if (config.nodeEnv !== 'production') return;

  if (config.secretsProvider !== 'external') {
    throw new Error('SECRETS_PROVIDER must be external in production');
  }

  if (!config.secretsNamespace?.trim()) {
    throw new Error('SECRETS_NAMESPACE must be configured in production');
  }

  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }

  if (INSECURE_DEFAULTS.has(config.jwtSecret)) {
    throw new Error('JWT_SECRET must be replaced before production deployment');
  }

  if (config.openAiApiKey && config.externalAiProcessingAck !== true) {
    throw new Error('External AI processing requires explicit production acknowledgement');
  }

  if (!config.metricsToken?.trim() || config.metricsToken.length < 32) {
    throw new Error('METRICS_TOKEN must contain at least 32 characters in production');
  }
}
