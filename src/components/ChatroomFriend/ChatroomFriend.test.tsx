import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';
import ChatroomFriend from './ChatroomFriend';

global.fetch = vi.fn(() =>
  Promise.resolve({ json: () => Promise.resolve([]) })
) as unknown as typeof fetch;

it('renders without crashing', () => {
  render(
    <ChatroomFriend
      userId={1}
      username="user"
      friendUsername="friend"
      friendId={2}
      groupId="group-1"
    />
  );
});
