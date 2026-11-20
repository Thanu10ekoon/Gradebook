import assert from 'node:assert/strict';
import test from 'node:test';

test('Vercel starts with a configured MySQL pool and serves an anonymous session', async () => {
  process.env.DATABASE_PASSWORD = 'unused-in-this-test';
  const { default: handler } = await import('../api/dispatch.js');
  const { getPool } = await import('../server/db.js');
  try {
    for (const path of ['/api/session', '/api/dispatch?action=session']) {
      const response = await handler.fetch(new Request('https://gradebook.example' + path));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { user: null });
    }
  } finally {
    delete process.env.DATABASE_PASSWORD;
    await getPool().end();
  }
});
