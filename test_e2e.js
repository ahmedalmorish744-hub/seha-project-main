const http = require('http');

// Helper wrapper for fetch (using http for compatibility if fetch missing, but Node 18+ has fetch)
// Assuming Node 18+ for this environment.
// If fetch is not available, I'll use a simple wrapper.

const API_URL = 'http://localhost:3000';

async function request(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    const text = await res.text();
    try {
        return { status: res.status, data: JSON.parse(text) };
    } catch {
        return { status: res.status, data: text };
    }
}

async function runTest() {
    console.log('--- Starting E2E Verification ---');

    // 1. Login Admin
    console.log('1. Logging in as Admin...');
    const adminLogin = await request('/api/login', 'POST', { username: 'admin', password: 'password123' });
    if (adminLogin.status !== 200) { console.error('Admin Login Failed', adminLogin); return; }
    const adminToken = adminLogin.data.token;
    console.log('   Admin Logged In.');

    // 2. Create User A
    const userA_Name = `userA_${Date.now()}`;
    console.log(`2. Creating User A (${userA_Name})...`);
    const createUserA = await request('/api/users', 'POST', { username: userA_Name, password: 'passwordA', role: 'user' }, adminToken);
    if (createUserA.status !== 200) { console.error('Create User A Failed', createUserA); return; }
    console.log('   User A Created.');

    // 3. Login User A
    console.log('3. Logging in as User A...');
    const userALogin = await request('/api/login', 'POST', { username: userA_Name, password: 'passwordA' });
    const userAToken = userALogin.data.token;
    console.log('   User A Logged In.');

    // 4. User A adds Patient
    const pName = `Patient_${Date.now()}`;
    console.log(`4. User A adding Patient (${pName})...`);
    // Need required fields from schema: identity_number, name_ar
    // Mapping uses input prefixes: inputidentity, inputnamear etc.
    const patientData = {
        inputidentity: '123456',
        inputnamear: pName,
        inputnameen: 'Test Patient',
        inputvisittype: 'Checkup'
    };
    const addPatientA = await request('/manger_data/patients', 'POST', patientData, userAToken);
    if (addPatientA.status !== 200) { console.error('Add Patient Failed', addPatientA); return; }
    const patientId = addPatientA.data.id;
    console.log('   Patient Added.');

    // 5. User A checks list
    console.log('5. User A checking list...');
    const listA = await request('/manger_data/patientsall', 'GET', null, userAToken);
    // Correct mapping: API returns inputnamear, not name_ar
    const foundA = listA.data.find(p => p.inputnamear === pName);
    if (foundA) console.log('   SUCCESS: User A sees their patient.');
    else console.error('   FAILURE: User A CANNOT see their patient.', listA.data[0]); // Log first item to debug if needed

    // 6. Create User B
    const userB_Name = `userB_${Date.now()}`;
    console.log(`6. Creating User B (${userB_Name})...`);
    await request('/api/users', 'POST', { username: userB_Name, password: 'passwordB', role: 'user' }, adminToken);

    // 7. Login User B
    console.log('7. Logging in as User B...');
    const userBLogin = await request('/api/login', 'POST', { username: userB_Name, password: 'passwordB' });
    const userBToken = userBLogin.data.token;

    // 8. User B checks list
    console.log('8. User B checking list (Should be empty of User A data)...');
    const listB = await request('/manger_data/patientsall', 'GET', null, userBToken);
    const foundB = listB.data.find(p => p.inputnamear === pName);
    if (!foundB) console.log('   SUCCESS: User B DOES NOT see User A\'s patient.');
    else console.error('   FAILURE: User B SEES User A\'s patient!');

    // 9. Admin checks list
    console.log('9. Admin checking list...');
    const listAdmin = await request('/manger_data/patientsall', 'GET', null, adminToken);
    const foundAdmin = listAdmin.data.find(p => p.inputnamear === pName);
    if (foundAdmin) console.log('   SUCCESS: Admin sees everything.');
    else console.error('   FAILURE: Admin CANNOT see the patient.');

    console.log('--- Verification Complete ---');
}

runTest();
