vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/auth', () => ({
  signToken: vi.fn().mockResolvedValue('token'),
  cookieOptions: vi.fn().mockReturnValue({ name: 'session', maxAge: 3600 }),
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST with email+password when user not found returns 422', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'secret' }),
    })
  );
  expect(res.status).toBe(422);
});
