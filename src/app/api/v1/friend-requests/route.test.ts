vi.mock('@/lib/models/FriendRequest', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    findByPk: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/models/Friend', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with no params returns 400', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/friend-requests'));
  expect(res.status).toBe(400);
});
