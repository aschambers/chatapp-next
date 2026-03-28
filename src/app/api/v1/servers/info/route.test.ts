vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with no serverId param returns 400', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/servers/info'));
  expect(res.status).toBe(400);
});
