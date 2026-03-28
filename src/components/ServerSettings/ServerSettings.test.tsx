import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import ServerSettings from './ServerSettings';

global.fetch = vi.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({}) })
) as unknown as typeof fetch;

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <ServerSettings
        serverId={1}
        serverName="Test"
        currentUsername="user"
        userId={1}
        onClose={vi.fn()}
        onServerDeleted={vi.fn()}
      />
    </Provider>
  );
});
