const db = require('./db');

async function migrate() {
    try {
        console.log('Migrating doctors table...');

        // Check if hospital_id exists
        const [columns] = await db.query("SHOW COLUMNS FROM doctors LIKE 'hospital_id'");
        if (columns.length === 0) {
            console.log('Adding hospital_id column...');
            await db.query("ALTER TABLE doctors ADD COLUMN hospital_id INT");
            await db.query("ALTER TABLE doctors ADD CONSTRAINT fk_doctor_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL");
            console.log('Column added successfully.');
        } else {
            console.log('Column hospital_id already exists.');
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
