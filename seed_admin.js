const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
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

    const username = 'admin';
    const password = 'password123'; // Change this!
    const role = 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            console.log('Admin user already exists.');
        } else {
            await connection.promise().query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
            console.log(`Admin user created. Username: ${username}, Password: ${password}`);
        }
    } catch (e) {
        console.error('Error creating admin:', e);
    }

    connection.end();
});
