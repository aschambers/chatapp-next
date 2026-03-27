import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';

export interface CategoryAttributes {
  id: number;
  name: string;
  serverId: number;
  order: number;
  visible: boolean;
  isPrivate: boolean;
  allowedUserIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

type CategoryCreationAttributes = Optional<
  CategoryAttributes,
  'id' | 'isPrivate' | 'allowedUserIds'
>;

class Category
  extends Model<CategoryAttributes, CategoryCreationAttributes>
  implements CategoryAttributes
{
  declare id: number;
  declare name: string;
  declare serverId: number;
  declare order: number;
  declare visible: boolean;
  declare isPrivate: boolean;
  declare allowedUserIds: number[];
  declare createdAt: Date;
  declare updatedAt: Date;
}

Category.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    serverId: { type: DataTypes.INTEGER, allowNull: false },
    order: { type: DataTypes.INTEGER, allowNull: false },
    visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isPrivate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    allowedUserIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
  },
  { sequelize, modelName: 'categories' }
);

export default Category;
