import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:8080';

async function testRegisterAndLogin() {
  try {
    console.log('🔐 Testing Register and Login flow...\n');

    // 1. Register a new user
    console.log('1️⃣ Registering new user...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: 'testuser123',
        displayName: 'Test User 123',
        email: 'testuser123@test.com',
        password: 'Test123!',
        phoneNumber: '0901234567',
        role: 'Citizen',
      }),
    });

    const registerData = await registerResponse.json();
    console.log('Register response:', JSON.stringify(registerData, null, 2));

    if (!registerData.success) {
      console.log('⚠️ Register failed (user may already exist), trying login anyway...\n');
    } else {
      console.log('✅ Register successful!\n');
    }

    // 2. Login with the user
    console.log('2️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser123@test.com',
        password: 'Test123!',
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (loginData.success && loginData.data?.token) {
      console.log('\n✅ Login successful!');
      console.log('Token (first 50 chars):', loginData.data.token.substring(0, 50));
    } else {
      console.log('\n❌ Login failed!');
    }

    // 3. Now test with seeded user
    console.log('\n3️⃣ Testing login with seeded user (citizen1)...');
    const seededLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen1@test.com',
        password: 'Test123!',
      }),
    });

    const seededLoginData = await seededLoginResponse.json();
    console.log('Seeded user login response:', JSON.stringify(seededLoginData, null, 2));

    if (seededLoginData.success && seededLoginData.data?.token) {
      console.log('\n✅ Seeded user login successful!');
    } else {
      console.log('\n❌ Seeded user login failed!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRegisterAndLogin();
