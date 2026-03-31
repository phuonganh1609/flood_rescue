import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env.test') });

const BASE_URL = 'http://127.0.0.1:8080';

async function registerUser(userData) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return await response.json();
}

async function seedViaAPI() {
  console.log('🌱 Seeding data via API...\n');

  try {
    // Create coordinators
    console.log('Creating coordinators...');
    for (let i = 1; i <= 3; i++) {
      const result = await registerUser({
        userName: `coordinator${i}`,
        displayName: `Coordinator ${i === 1 ? 'One' : i === 2 ? 'Two' : 'Three'}`,
        email: `coordinator${i}@test.com`,
        password: 'Test123!',
        phoneNumber: `090100000${i}`,
        role: 'Rescue Coordinator',
      });
      console.log(`- coordinator${i}:`, result.success ? '✅' : `❌ ${result.message}`);
    }

    // Create citizens
    console.log('\nCreating citizens...');
    const citizenNames = ['One', 'Two', 'Three', 'Four', 'Five'];
    for (let i = 1; i <= 5; i++) {
      const result = await registerUser({
        userName: `citizen${i}`,
        displayName: `Citizen ${citizenNames[i-1]}`,
        email: `citizen${i}@test.com`,
        password: 'Test123!',
        phoneNumber: `090200000${i}`,
        role: 'Citizen',
      });
      console.log(`- citizen${i}:`, result.success ? '✅' : `❌ ${result.message}`);
    }

    // Create team members
    console.log('\nCreating team members...');
    for (let teamNum = 1; teamNum <= 4; teamNum++) {
      // Team leader
      const leaderResult = await registerUser({
        userName: `team${teamNum}_leader`,
        displayName: `Team${teamNum} Leader`,
        email: `team${teamNum}_leader@test.com`,
        password: 'Test123!',
        phoneNumber: `09030${teamNum}001`,
        role: 'Rescue Team',
      });
      console.log(`- team${teamNum}_leader:`, leaderResult.success ? '✅' : `❌ ${leaderResult.message}`);

      // Team members
      for (let memberNum = 1; memberNum <= 2; memberNum++) {
        const memberResult = await registerUser({
          userName: `team${teamNum}_member${memberNum}`,
          displayName: `Team${teamNum} Member ${memberNum}`,
          email: `team${teamNum}_member${memberNum}@test.com`,
          password: 'Test123!',
          phoneNumber: `09030${teamNum}00${memberNum + 1}`,
          role: 'Rescue Team',
        });
        console.log(`- team${teamNum}_member${memberNum}:`, memberResult.success ? '✅' : `❌ ${memberResult.message}`);
      }
    }

    console.log('\n🎉 Seeding via API completed!');
    console.log('\n📝 Note: Teams and warehouses need to be created separately via database or admin panel');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedViaAPI();
