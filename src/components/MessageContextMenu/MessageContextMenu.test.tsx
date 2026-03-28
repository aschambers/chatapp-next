import { render } from '@testing-library/react';
import MessageContextMenu from './MessageContextMenu';

global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })) as vi.Mock;

const base = {
  isSelf: false,
  onReact: vi.fn(),
  onMoreReact: vi.fn(),
  onCopy: vi.fn(),
  onForward: vi.fn(),
  onClose: vi.fn(),
};

it('renders without crashing', () => {
  render(<MessageContextMenu {...base} />);
});
