const db = require('./db');

const updateSchema = async () => {
    try {
        console.log('Attempting to DROP nationality_en from patients table...');
        await db.query(`
            ALTER TABLE patients
            DROP COLUMN nationality_en;
        `);
        console.log('Successfully dropped nationality_en column.');
    } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log('Column nationality_en does not exist.');
        } else {
            console.error('Error updating schema:', err);
        }
    } finally {
        process.exit();
    }
};

updateSchema();
