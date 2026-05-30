const db = require('./db');

const updateSchema = async () => {
    try {
        console.log('Attempting to add nationality_id to patients table...');
        await db.query(`
            ALTER TABLE patients
            ADD COLUMN nationality_id INT NULL;
        `);
        console.log('Successfully added nationality_id column.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column nationality_id already exists.');
        } else {
            console.error('Error updating schema:', err);
        }
    } finally {
        process.exit();
    }
};

updateSchema();
