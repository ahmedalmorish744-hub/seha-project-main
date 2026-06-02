const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let poolConfig;

// Railway provides DATABASE_URL or MYSQL_URL
if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  console.log('Using DATABASE_URL for MySQL connection');
  poolConfig = {
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  console.log('Using individual DB env vars for MySQL connection');
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seha_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const pool = mysql.createPool(poolConfig);
module.exports = pool.promise();
