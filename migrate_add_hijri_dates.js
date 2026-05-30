const db = require('./db');

async function migrate() {
    try {
        console.log('Adding Hijri date columns to patients table...');

        // Add hijri_admission_date
        try {
            await db.query(`ALTER TABLE patients ADD COLUMN hijri_admission_date VARCHAR(50) AFTER date_from`);
            console.log('Added hijri_admission_date column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('hijri_admission_date column already exists.');
            } else {
                throw err;
            }
        }

        // Add hijri_discharge_date
        try {
            await db.query(`ALTER TABLE patients ADD COLUMN hijri_discharge_date VARCHAR(50) AFTER date_to`);
            console.log('Added hijri_discharge_date column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('hijri_discharge_date column already exists.');
            } else {
                throw err;
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
