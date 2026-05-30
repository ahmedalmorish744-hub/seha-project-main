const db = require('./db');

async function migrate() {
    try {
        console.log('Migrating patients table...');

        const columnsToAdd = [
            { name: 'employer_en', type: 'VARCHAR(255)' },
            { name: 'doctor_name_ar', type: 'VARCHAR(255)' },
            { name: 'doctor_name_en', type: 'VARCHAR(255)' },
            { name: 'doctor_specialty_ar', type: 'VARCHAR(255)' }, // Job Title Ar
            { name: 'doctor_specialty_en', type: 'VARCHAR(255)' }, // Job Title En
            { name: 'nationality_en', type: 'VARCHAR(255)' },
            { name: 'issue_date', type: 'DATETIME' } // Report Issue Date
        ];

        for (const col of columnsToAdd) {
            const [check] = await db.query(`SHOW COLUMNS FROM patients LIKE '${col.name}'`);
            if (check.length === 0) {
                console.log(`Adding ${col.name}...`);
                await db.query(`ALTER TABLE patients ADD COLUMN ${col.name} ${col.type}`);
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
