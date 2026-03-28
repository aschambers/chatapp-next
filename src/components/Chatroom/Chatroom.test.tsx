import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';
import Chatroom from './Chatroom';

global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })) as vi.Mock;

it('renders without crashing', () => {
  render(
    <Chatroom
      userId={1}
      username="user"
      activeChatroom="general"
      activeChatroomId={1}
      activeChatroomType="text"
      serverId={1}
      isAdmin={false}
      serverUserList={[]}
      onlineUsers={new Map()}
      onStartDM={vi.fn()}
    />
  );
});
