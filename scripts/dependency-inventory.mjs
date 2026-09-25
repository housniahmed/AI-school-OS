import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const roots = ['apps/api/package-lock.json', 'apps/web/package-lock.json'];
const policy = JSON.parse(await readFile(resolve('.github/dependency-policy.json'), 'utf8'));
const output = process.env.DEPENDENCY_INVENTORY_OUTPUT ?? 'dependency-inventory.json';
const deniedLicenses = new Set(policy.deniedLicenses ?? []);
const licenses = new Map();
const unknown = [];
const denied = [];

for (const root of roots) {
  const lock = JSON.parse(await readFile(resolve(root), 'utf8'));
  for (const [path, pkg] of Object.entries(lock.packages ?? {})) {
    if (!path.startsWith('node_modules/') || !pkg.version) continue;
    const license = typeof pkg.license === 'string' ? pkg.license : 'UNKNOWN';
    licenses.set(license, (licenses.get(license) ?? 0) + 1);
    const name = path.slice('node_modules/'.length);
    if (license === 'UNKNOWN') unknown.push({ workspace: root, name, version: pkg.version });
    if (deniedLicenses.has(license)) denied.push({ workspace: root, name, version: pkg.version, license });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  workspaces: roots,
  packageCount: [...licenses.values()].reduce((a, b) => a + b, 0),
  licenseCounts: Object.fromEntries([...licenses.entries()].sort(([a], [b]) => a.localeCompare(b))),
  unknownLicenses: unknown,
  deniedLicenses: denied
};

await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ packageCount: report.packageCount, uniqueLicenses: Object.keys(report.licenseCounts).length, unknownLicenses: unknown.length, deniedLicenses: denied.length }, null, 2));
if (denied.length > 0) {
  console.error('Denied licenses detected. Review .github/dependency-policy.json.');
  process.exit(1);
}