export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const sequelize = (await import('./lib/db')).default;

    // Register all models before syncing
    await import('./lib/models/User');
    await import('./lib/models/Server');
    await import('./lib/models/Chatroom');
    await import('./lib/models/Category');
    await import('./lib/models/Message');
    await import('./lib/models/Friend');
    await import('./lib/models/FriendRequest');
    await import('./lib/models/Invite');

    await sequelize.sync({ alter: true });
    console.log('[db] schema synced');
  }
}
