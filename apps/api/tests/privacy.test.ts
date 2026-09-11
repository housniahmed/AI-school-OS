import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAiAuditMetadata, redactDiagnosticText } from '../src/infra/privacy.js';

test('AI audit metadata never stores the submitted payload', () => {
  const metadata = buildAiAuditMetadata({ mode: 'provider', toolName: 'get_student_attendance_summary' });
  assert.deepEqual(metadata, {
    mode: 'provider',
    toolName: 'get_student_attendance_summary',
    payloadRecorded: false
  });
  assert.equal('message' in metadata, false);
});

test('diagnostic redaction removes common direct identifiers', () => {
  const value = 'Contact alice@example.com or +212 600 123 456';
  const redacted = redactDiagnosticText(value);
  assert.equal(redacted.includes('alice@example.com'), false);
  assert.equal(redacted.includes('+212 600 123 456'), false);
  assert.match(redacted, /\[REDACTED_EMAIL\]/);
  assert.match(redacted, /\[REDACTED_PHONE\]/);
});
