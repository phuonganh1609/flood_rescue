import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:8080';

async function testSimpleRequest() {
  try {
    // Login as citizen2
    console.log('1️⃣ Logging in as citizen2...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen2@test.com',
        password: 'Test123!',
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginData.data.accessToken;
    console.log('✅ Login successful\n');

    // Create request
    console.log('2️⃣ Creating request...');
    const createResponse = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'Relief',
        location: {
          type: 'Point',
          coordinates: [106.66, 10.76],
        },
        peopleCount: 5,
        requestSupplies: [{ name: 'Water', requestedQty: 10 }],
        description: 'Simple test request from citizen2',
      }),
    });

    const createData = await createResponse.json();
    console.log('Create response:', JSON.stringify(createData, null, 2));

    if (createData.success) {
      console.log('\n✅ Request created successfully!');
    } else {
      console.log('\n❌ Request creation failed!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimpleRequest();
