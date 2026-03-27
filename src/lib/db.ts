import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME ?? '',
  process.env.DB_USER ?? '',
  process.env.DB_PASSWORD ?? '',
  {
    dialect: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: 5432,
    pool: { max: 5, min: 0, idle: 30000, acquire: 60000 },
    dialectOptions: {
      ssl:
        process.env.DATABASE_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
    logging: false,
  }
);

export default sequelize;
