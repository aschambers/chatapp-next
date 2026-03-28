vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

import { PUT } from './route';
import { NextRequest } from 'next/server';

it('PUT when user is already verified returns already:true', async () => {
  const res = await PUT(
    new NextRequest('http://localhost/api/v1/users/verify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', token: 'abc123' }),
    })
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ already: true });
});
