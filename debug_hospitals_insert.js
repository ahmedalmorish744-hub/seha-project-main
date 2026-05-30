const db = require('./db');

async function debug() {
    try {
        console.log('--- Checking Columns ---');
        const [columns] = await db.query('SHOW COLUMNS FROM hospitals');
        console.log(columns.map(c => `${c.Field} (${c.Type})`));

        console.log('\n--- Attempting Test Insert ---');
        const testData = {
            type: 'Government',
            name_ar: 'Debug Ar',
            name_en: 'Debug En',
            logo: 'testlogo',
            city: 'Riyadh',
            region: 'Central',
            doctor_group_id: 'DEBUG-001',
            user_id: 1 // Assuming user 1 exists, or we leave it null if allowed?
            // Schema has user_id INT, FOREIGN KEY. So must be valid or null.
            // Application inserts with req.user.id.
        };

        // Find a valid user first to mimic app behavior
        const [users] = await db.query('SELECT id FROM users LIMIT 1');
        if (users.length > 0) {
            testData.user_id = users[0].id;
        } else {
            console.log('No users found, setting user_id to NULL (might fail if app enforces valid user, but schema allows NULL?)');
            testData.user_id = null;
        }

        console.log('Inserting:', testData);
        await db.query('INSERT INTO hospitals SET ?', testData);
        console.log('Insert Successful!');

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        process.exit();
    }
}

debug();
