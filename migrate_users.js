const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
});

connection.connect(async (err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL.');

    // Switch to database
    await connection.promise().query('USE seha_db');

    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'user') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        // Check if column exists strictly before adding to avoid error, or just use try-catch block
        `ALTER TABLE hospitals ADD COLUMN user_id INT`,
        `ALTER TABLE hospitals ADD CONSTRAINT fk_hospitals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,

        `ALTER TABLE doctors ADD COLUMN user_id INT`,
        `ALTER TABLE doctors ADD CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,

        `ALTER TABLE patients ADD COLUMN user_id INT`,
        `ALTER TABLE patients ADD CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
    ];

    for (const q of queries) {
        try {
            await connection.promise().query(q);
            console.log('Executed:', q.substring(0, 50) + '...');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column already exists, skipping:', q.substring(0, 50) + '...');
            } else if (e.code === 'ER_DUP_KEYNAME') {
                console.log('Constraint already exists, skipping:', q.substring(0, 50) + '...');
            } else {
                console.error('Error executing query:', e.message);
            }
        }
    }

    console.log('Migration complete.');
    connection.end();
});
