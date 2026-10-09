import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const policy = JSON.parse(await readFile(resolve('.github/dependency-policy.json'), 'utf8'));
const exceptions = policy.exceptions ?? [];
const seen = new Set();
const today = new Date().toISOString().slice(0, 10);

for (const exception of exceptions) {
  for (const field of ['id', 'package', 'reason', 'owner', 'expiresOn']) {
    if (typeof exception[field] !== 'string' || exception[field].trim() === '') {
      throw new Error('Dependency exception is missing required field: ' + field);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.expiresOn)) {
    throw new Error('Invalid exception expiry date: ' + exception.expiresOn);
  }
  if (exception.expiresOn < today) {
    throw new Error('Expired dependency exception: ' + exception.id);
  }
  if (seen.has(exception.id)) {
    throw new Error('Duplicate dependency exception id: ' + exception.id);
  }
  seen.add(exception.id);
}

console.log('Validated ' + exceptions.length + ' dependency exception(s); no expired exceptions.');