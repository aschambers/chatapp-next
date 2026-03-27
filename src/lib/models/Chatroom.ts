import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface ChatroomAttributes {
  id: number;
  name: string;
  serverId: number;
  type: string;
  categoryId: number | null;
  position: number | null;
  slowmode: number;
  isPrivate: boolean;
  allowedUserIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

type ChatroomCreationAttributes = Optional<
  ChatroomAttributes,
  'id' | 'categoryId' | 'position' | 'slowmode' | 'isPrivate' | 'allowedUserIds'
>;

class Chatroom
  extends Model<ChatroomAttributes, ChatroomCreationAttributes>
  implements ChatroomAttributes
{
  declare id: number;
  declare name: string;
  declare serverId: number;
  declare type: string;
  declare categoryId: number | null;
  declare position: number | null;
  declare slowmode: number;
  declare isPrivate: boolean;
  declare allowedUserIds: number[];
  declare createdAt: Date;
  declare updatedAt: Date;
}

Chatroom.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    serverId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'text' },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    position: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    slowmode: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isPrivate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    allowedUserIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'chatrooms' }
);

export default Chatroom;
