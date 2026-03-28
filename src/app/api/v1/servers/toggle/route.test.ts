vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

import { PUT } from './route';
import { NextRequest } from 'next/server';

it('PUT when user not found returns 422', async () => {
  const res = await PUT(
    new NextRequest('http://localhost/api/v1/servers/toggle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 1, serverId: 1, active: true }),
    })
  );
  expect(res.status).toBe(422);
});
