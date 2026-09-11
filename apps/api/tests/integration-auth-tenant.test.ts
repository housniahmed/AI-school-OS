import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://schoolos:schoolos@localhost:5432/schoolos';
// The HTTP server still listens on an ephemeral OS-assigned port below.
// PORT only needs to satisfy the application configuration schema during module import.
process.env.PORT ??= '4000';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.TRUST_PROXY ??= '1';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_SECRET ??= 'ci-only-secret-with-32-characters-minimum';

const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');
const { connectRedis, disconnectRedis } = await import('../src/infra/redis.js');

let server: Server | undefined;
let baseUrl = '';
let tenantAId = '';
let tenantBId = '';
let assetAId = '';
let assetBId = '';

async function request(path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, init);
}

async function login(email: string, password: string) {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200);
  return (await response.json()) as { token: string };
}

before(async () => {
  await connectRedis();

  const suffix = randomUUID().slice(0, 8);
  const password = 'Integration@12345';
  const passwordHash = await bcrypt.hash(password, 4);

  const role = await prisma.role.upsert({
    where: { id: 'integration-director-role' },
    update: { name: 'INTEGRATION_DIRECTOR' },
    create: { id: 'integration-director-role', name: 'INTEGRATION_DIRECTOR' }
  });
  const permission = await prisma.permission.upsert({
    where: { code: 'assets:read' },
    update: {},
    create: { code: 'assets:read' }
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
    update: {},
    create: { roleId: role.id, permissionId: permission.id }
  });

  const tenantA = await prisma.tenant.create({ data: { name: `Integration A ${suffix}`, slug: `integration-a-${suffix}` } });
  const tenantB = await prisma.tenant.create({ data: { name: `Integration B ${suffix}`, slug: `integration-b-${suffix}` } });
  tenantAId = tenantA.id;
  tenantBId = tenantB.id;

  const userA = await prisma.user.create({
    data: {
      tenantId: tenantAId,
      email: `a-${suffix}@example.test`,
      firstName: 'Tenant',
      lastName: 'A',
      roles: { create: { roleId: role.id } },
      credential: { create: { passwordHash } }
    }
  });
  await prisma.user.create({
    data: {
      tenantId: tenantBId,
      email: `b-${suffix}@example.test`,
      firstName: 'Tenant',
      lastName: 'B',
      roles: { create: { roleId: role.id } },
      credential: { create: { passwordHash } }
    }
  });

  const assetA = await prisma.asset.create({ data: { tenantId: tenantAId, assetCode: `A-${suffix}`, name: 'Tenant A Laptop', category: 'IT', qrToken: randomUUID() } });
  const assetB = await prisma.asset.create({ data: { tenantId: tenantBId, assetCode: `B-${suffix}`, name: 'Tenant B Laptop', category: 'IT', qrToken: randomUUID() } });
  assetAId = assetA.id;
  assetBId = assetB.id;

  server = createServer(createApp());
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;

  assert.ok(userA.id);
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  }
  if (tenantAId && tenantBId) {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  }
  await Promise.allSettled([prisma.$disconnect(), disconnectRedis()]);
});

test('health readiness reports database and Redis connectivity', async () => {
  const response = await request('/health/ready');
  assert.equal(response.status, 200);
  const body = await response.json() as { status: string; dependencies: { database: string; redis: string } };
  assert.equal(body.status, 'ready');
  assert.equal(body.dependencies.database, 'ok');
  assert.equal(body.dependencies.redis, 'ok');
});

test('requests receive correlation and security headers', async () => {
  const response = await request('/api/v1');
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('x-request-id'));
  assert.ok(response.headers.get('content-security-policy'));
  assert.ok(response.headers.get('ratelimit'));
});

test('login issues a token for an active user', async () => {
  const suffix = (await prisma.tenant.findUniqueOrThrow({ where: { id: tenantAId } })).slug.replace('integration-a-', '');
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `a-${suffix}@example.test`, password: 'Integration@12345' })
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { token: string };
  assert.ok(body.token);
});

test('tenant A cannot see tenant B assets', async () => {
  const suffix = (await prisma.tenant.findUniqueOrThrow({ where: { id: tenantAId } })).slug.replace('integration-a-', '');
  const { token } = await login(`a-${suffix}@example.test`, 'Integration@12345');
  const response = await request('/api/v1/assets', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const body = await response.json() as { data: Array<{ id: string }> };
  assert.deepEqual(body.data.map((asset) => asset.id), [assetAId]);
});

test('tenant A gets 404 for a tenant B asset id', async () => {
  const suffix = (await prisma.tenant.findUniqueOrThrow({ where: { id: tenantAId } })).slug.replace('integration-a-', '');
  const { token } = await login(`a-${suffix}@example.test`, 'Integration@12345');
  const response = await request(`/api/v1/assets/${assetBId}`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 404);
});
