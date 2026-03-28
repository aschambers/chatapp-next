vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    destroy: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/models/Chatroom', () => ({
  __esModule: true,
  default: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: { uploader: { upload: vi.fn() } },
}));

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn().mockResolvedValue(null),
}));

import { GET } from './route';
import { NextRequest } from 'next/server';

it('GET with ?id=1 when user not found returns 422', async () => {
  const res = await GET(new NextRequest('http://localhost/api/v1/servers?id=1'));
  expect(res.status).toBe(422);
});
