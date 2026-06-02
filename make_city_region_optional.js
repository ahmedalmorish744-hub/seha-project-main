const db = require('./db');

const updateSchema = async () => {
    try {
        console.log('Attempting to MODIFY city and region to be NULLable in hospitals table...');
        // Assuming VARCHAR(255) based on typical usage, adjusting if needed.
        await db.query(`
            ALTER TABLE hospitals
            MODIFY COLUMN city VARCHAR(255) NULL,
            MODIFY COLUMN region VARCHAR(255) NULL;
        `);
        console.log('Successfully modified city and region columns to be optional.');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        process.exit();
    }
};

updateSchema();
