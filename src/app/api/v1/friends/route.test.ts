vi.mock('@/lib/models/Friend', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with no userId returns 400', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/friends'));
  expect(res.status).toBe(400);
});
