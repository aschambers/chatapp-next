vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with ?serverId=1 when server not found returns 422', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/servers/user-bans?serverId=1'));
  expect(res.status).toBe(422);
});
