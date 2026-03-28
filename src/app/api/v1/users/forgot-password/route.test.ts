vi.mock('resend', () => ({
  Resend: class {
    emails = { send: () => Promise.resolve({ error: null }) };
  },
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST with empty body (no email) returns 400', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/users/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  );
  expect(res.status).toBe(400);
});
