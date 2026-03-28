vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: { uploader: { upload: vi.fn() } },
}));

import { PUT } from './route';
import { NextRequest } from 'next/server';

it('PUT with empty FormData (no serverId/userId) returns 400', async () => {
  const res = await PUT(
    new NextRequest('http://localhost/api/v1/servers/update', {
      method: 'PUT',
      body: new FormData(),
    })
  );
  expect(res.status).toBe(400);
});
