import { render } from '@testing-library/react';
import UserProfileModal from './UserProfileModal';

global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })) as vi.Mock;

it('renders without crashing', () => {
  render(<UserProfileModal userId={1} username="user" isSelf onClose={vi.fn()} />);
});
