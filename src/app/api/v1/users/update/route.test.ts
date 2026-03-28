vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: { uploader: { upload: vi.fn() } },
}));

vi.mock('@/lib/auth', () => ({
  signToken: vi.fn().mockResolvedValue('token'),
  cookieOptions: vi.fn().mockReturnValue({ name: 'session', maxAge: 3600 }),
}));

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: vi.fn().mockResolvedValue([]), fn: vi.fn(), col: vi.fn() },
}));

import { PUT } from './route';
import { NextRequest } from 'next/server';

it('PUT with empty FormData (no userId) returns 400', async () => {
  const res = await PUT(
    new NextRequest('http://localhost/api/v1/users/update', {
      method: 'PUT',
      body: new FormData(),
    })
  );
  expect(res.status).toBe(400);
});
