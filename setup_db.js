const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
});

const schemaPath = path.join(__dirname, '../schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split by semicolon to get individual statements, filtering out empty ones
const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL server:', err.message);
        console.log('Please ensure MySQL is running and credentials in .env are correct.');
        process.exit(1);
    }

    console.log('Connected to MySQL server.');

    // Execute statements sequentially
    const executeStatements = async () => {
        for (const statement of statements) {
            try {
                await connection.promise().query(statement);
                console.log('Executed statement.');
            } catch (err) {
                console.error('Error executing statement:', err.message);
                // Continue even if error (e.g., if table exists)
            }
        }
        console.log('Database setup completed.');
        connection.end();
    };

    executeStatements();
});
