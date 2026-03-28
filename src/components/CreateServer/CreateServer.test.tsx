import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import CreateServer from './CreateServer';

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <CreateServer userId={1} onClose={vi.fn()} onSuccess={vi.fn()} />
    </Provider>
  );
});
