vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with ?serverId=1 when server not found returns 422', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/servers/user-list?serverId=1'));
  expect(res.status).toBe(422);
});
