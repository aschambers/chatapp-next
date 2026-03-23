import sequelize from './db';

const migrations: { id: string; sql: string }[] = [
  {
    id: '001_add_slowmode',
    sql: `ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS slowmode INTEGER DEFAULT 0`,
  },
  {
    id: '002_add_position',
    sql: `ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS position INTEGER`,
  },
  {
    id: '003_add_name_color_users',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS "nameColor" VARCHAR(255)`,
  },
  {
    id: '004_add_name_color_messages',
    sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS "nameColor" VARCHAR(255)`,
  },
  {
    id: '005_normalize_user_list_ids',
    sql: `
      UPDATE servers SET "userList" = (
        SELECT jsonb_agg(elem || jsonb_build_object('userId', (elem->>'userId')::int))
        FROM jsonb_array_elements("userList") AS elem
      ) WHERE "userList" IS NOT NULL AND "userList" != 'null'::jsonb
    `,
  },
  {
    id: '006_normalize_user_bans_ids',
    sql: `
      UPDATE servers SET "userBans" = (
        SELECT jsonb_agg(elem || jsonb_build_object('userId', (elem->>'userId')::int))
        FROM jsonb_array_elements("userBans") AS elem
      ) WHERE "userBans" IS NOT NULL AND "userBans" != 'null'::jsonb
    `,
  },
  {
    id: '007_add_reactions_messages',
    sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB`,
  },
  {
    id: '008_add_parent_id_messages',
    sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS "parentId" INTEGER`,
  },
  {
    id: '009_add_is_private_chatrooms',
    sql: `ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN DEFAULT false`,
  },
  {
    id: '010_add_is_private_messages',
    sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN DEFAULT false`,
  },
  {
    id: '011_add_is_private_categories',
    sql: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN DEFAULT false`,
  },
  {
    id: '012_add_allowed_user_ids_categories',
    sql: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS "allowedUserIds" JSONB DEFAULT '[]'`,
  },
  {
    id: '013_add_allowed_user_ids_chatrooms',
    sql: `ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS "allowedUserIds" JSONB DEFAULT '[]'`,
  },
  {
    id: '014_add_is_pinned_messages',
    sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT false`,
  },
  {
    id: '015_create_friend_requests',
    sql: `
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        "senderId" INTEGER NOT NULL,
        "senderUsername" VARCHAR(255) NOT NULL,
        "senderImageUrl" VARCHAR(255),
        "receiverId" INTEGER NOT NULL,
        "receiverUsername" VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `,
  },
  {
    id: '016_fix_friend_usernames',
    sql: `
      UPDATE friends f
      SET username = u.username
      FROM users u
      WHERE f."friendId" = u.id
    `,
  },
  {
    id: '017_fix_friend_images',
    sql: `
      UPDATE friends f
      SET "imageUrl" = u."imageUrl"
      FROM users u
      WHERE f."friendId" = u.id
    `,
  },
  {
    id: '018_add_is_friend_friends',
    sql: `ALTER TABLE friends ADD COLUMN IF NOT EXISTS "isFriend" BOOLEAN DEFAULT false`,
  },
  {
    id: '019_backfill_is_friend',
    sql: `
      UPDATE friends f
      SET "isFriend" = true
      FROM friend_requests fr
      WHERE fr.status = 'accepted'
        AND (
          (fr."senderId" = f."userId" AND fr."receiverId" = f."friendId")
          OR (fr."receiverId" = f."userId" AND fr."senderId" = f."friendId")
        )
    `,
  },
];

export async function runMigrations() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      ran_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const [ran] = await sequelize.query(`SELECT id FROM migrations`);
  const ranIds = new Set((ran as { id: string }[]).map(r => r.id));

  for (const migration of migrations) {
    if (ranIds.has(migration.id)) continue;
    try {
      await sequelize.query(migration.sql);
      await sequelize.query(`INSERT INTO migrations (id) VALUES (:id)`, {
        replacements: { id: migration.id },
      });
      console.log(`[migrate] ran ${migration.id}`);
    } catch (err: unknown) {
      console.warn(`[migrate] skipped ${migration.id}:`, (err as Error).message);
    }
  }
}
