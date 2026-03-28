import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import DashboardClient from './DashboardClient';

global.fetch = vi.fn(() =>
  Promise.resolve({ json: () => Promise.resolve([]) })
) as unknown as typeof fetch;

const user = {
  id: 1,
  username: 'user',
  email: 'user@test.com',
  nameColor: null,
  imageUrl: null,
  description: null,
};

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <DashboardClient
        initialUser={user as never}
        initialServers={[]}
        initialActiveServer={null}
        initialPendingChatroomId={null}
      />
    </Provider>
  );
});
