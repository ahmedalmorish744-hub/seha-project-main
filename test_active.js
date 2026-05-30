const http = require('http');

const API_URL = 'http://localhost:3001';

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
    console.log('--- Starting Activation & Profile Verification ---');

    // 1. Login Admin
    console.log('1. Logging in as Admin...');
    const adminLogin = await request('/api/login', 'POST', { username: 'admin', password: 'password123' });
    const adminToken = adminLogin.data.token;
    if (!adminToken) { console.error('Admin login failed'); return; }

    // 2. Create User C
    const userC_Name = `userC_${Date.now()}`;
    console.log(`2. Creating User C (${userC_Name})...`);
    const createUserC = await request('/api/users', 'POST', { username: userC_Name, password: 'passwordC', role: 'user' }, adminToken);
    const userId = createUserC.data.id;
    console.log('   User C Created.');

    // 3. Login User C (Should succeed)
    console.log('3. Logging in as User C...');
    let loginC = await request('/api/login', 'POST', { username: userC_Name, password: 'passwordC' });
    if (loginC.status === 200) console.log('   SUCCESS: User C logged in.');
    else console.error('   FAILURE: User C could not login.', loginC.data);
    const userCToken = loginC.data.token;

    // 4. Update Profile (User C changes password)
    console.log('4. User C updating password...');
    const updateProfile = await request('/api/profile', 'PUT', { username: userC_Name, password: 'newpassword' }, userCToken);
    if (updateProfile.status === 200) console.log('   SUCCESS: Profile updated.');
    else console.error('   FAILURE: Profile update failed.', updateProfile.data);

    // 5. Login User C with OLD password (Should fail)
    console.log('5. Logging in with OLD password...');
    const failLogin = await request('/api/login', 'POST', { username: userC_Name, password: 'passwordC' });
    if (failLogin.status === 401) console.log('   SUCCESS: Old password rejected.');
    else console.error('   FAILURE: Old password accepted or wrong error.', failLogin.status);

    // 6. Login User C with NEW password
    console.log('6. Logging in with NEW password...');
    const successLogin = await request('/api/login', 'POST', { username: userC_Name, password: 'newpassword' });
    if (successLogin.status === 200) console.log('   SUCCESS: New password accepted.');
    else console.error('   FAILURE: New password rejected.', successLogin.data);

    // 7. Admin Disables User C
    console.log('7. Admin disabling User C...');
    // Fetch user to get current data logic is in frontend, here we just toggle
    const disableUser = await request(`/api/users/${userId}`, 'PUT', { username: userC_Name, role: 'user', is_active: 0 }, adminToken);
    if (disableUser.status === 200) console.log('   SUCCESS: User C disabled.');
    else console.error('   FAILURE: Could not disable User C.', disableUser.data);

    // 8. User C tries to login (Should fail with 403)
    console.log('8. User C trying to login (Disabled)...');
    const disabledLogin = await request('/api/login', 'POST', { username: userC_Name, password: 'newpassword' });
    if (disabledLogin.status === 403) console.log('   SUCCESS: Login blocked (Account Disabled).');
    else console.error('   FAILURE: Login NOT blocked correctly.', disabledLogin.status, disabledLogin.data);

    console.log('--- Verification Complete ---');
}

runTest();
