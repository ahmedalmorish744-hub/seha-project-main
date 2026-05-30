const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'seha_db'
});

connection.connect(async (err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL.');

    try {
        await connection.promise().query("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
        console.log("Added is_active column to users table.");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column is_active already exists.");
        } else {
            console.error("Error adding column:", e.message);
        }
    }

    connection.end();
});
