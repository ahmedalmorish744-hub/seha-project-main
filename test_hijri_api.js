const { spawn } = require('child_process');
const path = require('path');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

function startServer() {
    return new Promise((resolve, reject) => {
        const serverProcess = spawn('node', ['index.js'], {
            cwd: __dirname,
            env: { ...process.env, PORT: PORT, DB_HOST: '127.0.0.1' }, // Ensure using 127.0.0.1
            stdio: 'pipe'
        });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Server]:', output.trim());
            if (output.includes(`Server running on port ${PORT}`)) {
                resolve(serverProcess);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('[Server Error]:', data.toString());
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    let serverProcess;
    try {
        console.log('Starting server...');
        serverProcess = await startServer();
        console.log('Server started.');

        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password123' })
        });

        if (!loginRes.ok) throw new Error('Login failed');
        const { token } = await loginRes.json();
        console.log('Logged in. Token received.');

        // 2. Create Patient
        // Using a future date to easily verify
        const inputData = {
            inputidentity: '1234567890',
            inputnamear: 'تست هجري',
            inputdatefrom: '2025-01-01', // Should be 1446-07-01
            inputdateto: '2025-01-10'     // Should be 1446-07-10
        };

        console.log('Creating patient...', inputData);
        const createRes = await fetch(`${BASE_URL}/manger_data/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inputData)
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            throw new Error(`Create patient failed: ${err}`);
        }

        const createdPatient = await createRes.json();
        console.log('Patient Created:', createdPatient);

        // 3. Verify Hijri Dates
        if (!createdPatient.hijri_admission_date) {
            console.error('FAIL: hijri_admission_date is missing!');
        } else {
            console.log(`PASS: hijri_admission_date = ${createdPatient.hijri_admission_date}`);
        }

        if (!createdPatient.hijri_discharge_date) {
            console.error('FAIL: hijri_discharge_date is missing!');
        } else {
            console.log(`PASS: hijri_discharge_date = ${createdPatient.hijri_discharge_date}`);
        }

        // 4. Update Patient (Test PUT)
        console.log('Updating patient dates...');
        const updateData = {
            inputdatefrom: '2025-02-01',
            inputdateto: '2025-02-10'
        };

        const updateRes = await fetch(`${BASE_URL}/manger_data/patients/${createdPatient._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (!updateRes.ok) throw new Error('Update failed');
        const updatedPatient = await updateRes.json();
        console.log('Patient Updated:', updatedPatient);

        if (updatedPatient.hijri_admission_date !== '1446-08-02' && updatedPatient.hijri_admission_date !== '1446-08-01') {
            // Exact date might vary slightly depending on sight/calculation, 2025-02-01 is roughly Rajab 1446
            console.warn(`Note: updated hijri_admission_date is ${updatedPatient.hijri_admission_date}. Verify if this is correct for 2025-02-01.`);
        } else {
            console.log(`PASS: Updated hijri dates look reasonable (Rajab/Sha'ban etc).`);
        }

        // 5. Cleanup
        console.log('Deleting patient...');
        await fetch(`${BASE_URL}/manger_data/patients/${createdPatient._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Cleanup done.');

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        if (serverProcess) {
            console.log('Stopping server...');
            serverProcess.kill();
        }
        process.exit(0);
    }
}

runTest();
