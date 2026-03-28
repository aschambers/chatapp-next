vi.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: { uploader: { upload: vi.fn() } },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST with empty FormData (no file) returns 400', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/upload', {
      method: 'POST',
      body: new FormData(),
    })
  );
  expect(res.status).toBe(400);
});
