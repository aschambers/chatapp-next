vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn().mockResolvedValue(null),
  cookieOptions: vi.fn().mockReturnValue({ name: 'session', maxAge: 3600 }),
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST with no session returns 401', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/users/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  );
  expect(res.status).toBe(401);
});
