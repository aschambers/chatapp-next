import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface FriendRequestAttributes {
  id: number;
  senderId: number;
  senderUsername: string;
  senderImageUrl: string | null;
  receiverId: number;
  receiverUsername: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type FriendRequestCreationAttributes = Optional<
  FriendRequestAttributes,
  'id' | 'senderImageUrl' | 'status'
>;

class FriendRequest
  extends Model<FriendRequestAttributes, FriendRequestCreationAttributes>
  implements FriendRequestAttributes
{
  declare id: number;
  declare senderId: number;
  declare senderUsername: string;
  declare senderImageUrl: string | null;
  declare receiverId: number;
  declare receiverUsername: string;
  declare status: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

FriendRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    senderUsername: { type: DataTypes.STRING, allowNull: false },
    senderImageUrl: { type: DataTypes.STRING, allowNull: true },
    receiverId: { type: DataTypes.INTEGER, allowNull: false },
    receiverUsername: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'friend_requests', tableName: 'friend_requests', timestamps: true }
);

export default FriendRequest;
