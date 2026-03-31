import { test, expect } from '@playwright/test';

test.describe('Verify Login', () => {
  test('Register new user and login', async ({ request }) => {
    // Register a new user
    const registerResponse = await request.post('http://127.0.0.1:8080/api/auth/register', {
      data: {
        userName: 'testuser999',
        displayName: 'Test User 999',
        email: 'testuser999@test.com',
        password: 'Test123!',
        phoneNumber: '0909999999',
        role: 'Citizen',
      },
    });

    const registerData = await registerResponse.json();
    console.log('Register response:', JSON.stringify(registerData, null, 2));

    // Login with the newly registered user
    const loginResponse = await request.post('http://127.0.0.1:8080/api/auth/login', {
      data: {
        email: 'testuser999@test.com',
        password: 'Test123!',
      },
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    expect(loginData.success).toBe(true);
    expect(loginData.data).toBeTruthy();
    expect(loginData.data.accessToken).toBeTruthy();
  });

  test('Login with seeded citizen1', async ({ request }) => {
    const loginResponse = await request.post('http://127.0.0.1:8080/api/auth/login', {
      data: {
        email: 'citizen1@test.com',
        password: 'Test123!',
      },
    });

    const loginData = await loginResponse.json();
    console.log('Citizen1 login response:', JSON.stringify(loginData, null, 2));

    expect(loginData.success).toBe(true);
    expect(loginData.data).toBeTruthy();
    expect(loginData.data.accessToken).toBeTruthy();
  });
});
