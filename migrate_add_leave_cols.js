const db = require('./db');

async function migrate() {
    try {
        console.log('Migrating patients table...');

        try {
            await db.query(`ALTER TABLE patients ADD COLUMN leave_file_path VARCHAR(255)`);
            console.log('Added leave_file_path column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('leave_file_path column already exists.');
            } else {
                throw err;
            }
        }

        try {
            await db.query(`ALTER TABLE patients ADD COLUMN prevent_inquiry BOOLEAN DEFAULT FALSE`);
            console.log('Added prevent_inquiry column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('prevent_inquiry column already exists.');
            } else {
                throw err;
            }
        }

        console.log('Migration complete.');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
