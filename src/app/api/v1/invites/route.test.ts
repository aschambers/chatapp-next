vi.mock('@/lib/models/Invite', () => ({
  __esModule: true,
  default: {
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    destroy: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/models/Server', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('resend', () => ({
  Resend: class { emails = { send: () => Promise.resolve({ error: null }) }; }
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

it('POST with serverId but no expires returns 400', async () => {
  const res = await POST(
    new NextRequest('http://localhost/api/v1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId: 1 }),
    })
  );
  expect(res.status).toBe(400);
});
