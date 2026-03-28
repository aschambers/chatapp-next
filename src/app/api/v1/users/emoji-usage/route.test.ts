vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: vi.fn().mockResolvedValue([]), fn: vi.fn(), col: vi.fn() },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with no session returns 401', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/users/emoji-usage'));
  expect(res.status).toBe(401);
});
