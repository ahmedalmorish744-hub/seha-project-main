const db = require('./db');

const updateSchema = async () => {
    try {
        console.log('Attempting to ADD leave_type column to patients table...');
        await db.query(`
            ALTER TABLE patients
            ADD COLUMN leave_type ENUM('Visit', 'Sick', 'Companion') NULL;
        `);
        console.log('Successfully added leave_type column.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column leave_type already exists.');
        } else {
            console.error('Error updating schema:', err);
        }
    } finally {
        process.exit();
    }
};

updateSchema();
