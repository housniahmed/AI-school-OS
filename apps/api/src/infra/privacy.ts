const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<!\d)(?:\+?\d[\d .()\-]{7,}\d)(?!\d)/g;

/**
 * Privacy-safe audit summary. Audit records must describe an operation without
 * persisting the submitted personal-data payload.
 */
export function buildAiAuditMetadata(input: {
  mode: string;
  toolName?: string | null;
}) {
  return {
    mode: input.mode,
    toolName: input.toolName ?? null,
    payloadRecorded: false
  };
}

/**
 * Redact common direct identifiers before a value is allowed into diagnostics.
 * This is defense-in-depth; application logs should still avoid raw payloads.
 */
export function redactDiagnosticText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(PHONE_PATTERN, '[REDACTED_PHONE]');
}

export const PRIVACY_CONTROL_VERSION = '0.6.0';
