vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST when user not found returns 422', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/servers/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId: 1, userId: 1 }),
    })
  );
  expect(res.status).toBe(422);
});
