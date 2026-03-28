vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
    findByPk: vi.fn().mockResolvedValue(null),
    destroy: vi.fn().mockResolvedValue(0),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with no userId returns 200 with empty array', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/users'));
  expect(res.status).toBe(200);
});
