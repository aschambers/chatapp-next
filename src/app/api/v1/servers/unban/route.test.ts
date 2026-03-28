vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST when server not found returns 422', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/servers/unban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 1, serverId: 1 }),
    })
  );
  expect(res.status).toBe(422);
});
