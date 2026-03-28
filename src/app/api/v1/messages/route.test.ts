vi.mock('@/lib/models/Message', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
    findByPk: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    destroy: vi.fn().mockResolvedValue(0),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: vi.fn().mockResolvedValue([]), fn: vi.fn(), col: vi.fn() },
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST with empty body (missing fields) returns 400', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  );
  expect(res.status).toBe(400);
});
