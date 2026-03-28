vi.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findByPk: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    destroy: vi.fn().mockResolvedValue(0),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with no serverId returns 400', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/categories'));
  expect(res.status).toBe(400);
});
