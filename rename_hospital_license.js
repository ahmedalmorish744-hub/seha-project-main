const db = require('./db');

const updateSchema = async () => {
    try {
        console.log('Attempting to RENAME doctor_group_id to license_number in hospitals table...');
        await db.query(`
            ALTER TABLE hospitals
            CHANGE COLUMN doctor_group_id license_number VARCHAR(255) NULL;
        `);
        console.log('Successfully renamed doctor_group_id to license_number.');
    } catch (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            console.log('Column doctor_group_id does not exist (already renamed?).');
        } else {
            console.error('Error updating schema:', err);
        }
    } finally {
        process.exit();
    }
};

updateSchema();
