import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import UserSettings from './UserSettings';

global.fetch = vi.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({}) })
) as unknown as typeof fetch;

const user = { id: 1, username: 'user', email: 'user@test.com', nameColor: null };

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <UserSettings user={user as never} onClose={vi.fn()} onSaved={vi.fn()} />
    </Provider>
  );
});
