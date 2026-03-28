const socketMock = {
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/lib/socket', () => ({
  getSocket: () => socketMock,
}));

export default socketMock;
