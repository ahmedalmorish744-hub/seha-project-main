const db = require('./db');

async function migrate() {
    try {
        console.log('Migrating hospitals table...');

        // Add city column
        const [cityCol] = await db.query("SHOW COLUMNS FROM hospitals LIKE 'city'");
        if (cityCol.length === 0) {
            console.log('Adding city column...');
            await db.query("ALTER TABLE hospitals ADD COLUMN city VARCHAR(100)");
        }

        // Add region column
        const [regionCol] = await db.query("SHOW COLUMNS FROM hospitals LIKE 'region'");
        if (regionCol.length === 0) {
            console.log('Adding region column...');
            await db.query("ALTER TABLE hospitals ADD COLUMN region VARCHAR(100)");
        }

        // Drop location column
        const [locationCol] = await db.query("SHOW COLUMNS FROM hospitals LIKE 'location'");
        if (locationCol.length > 0) {
            console.log('Dropping location column...');
            await db.query("ALTER TABLE hospitals DROP COLUMN location");
        }

        // Drop central_id column
        const [centralIdCol] = await db.query("SHOW COLUMNS FROM hospitals LIKE 'central_id'");
        if (centralIdCol.length > 0) {
            console.log('Dropping central_id column...');
            await db.query("ALTER TABLE hospitals DROP COLUMN central_id");
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
