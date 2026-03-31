import { connectTestDb, clearTestDb } from './testDb.js';
import {
  createTestCitizen,
  createTestCoordinator,
  createTestTeamMember,
  createTestTeam,
  createTestWarehouse,
  createTestInventoryItem,
} from '../factories/testData.js';

// Import models
import User from '../../src/modules/users/user.model.js';
import Team from '../../src/modules/teams/team.model.js';
import Warehouse from '../../src/modules/warehouse/warehouse.model.js';
import InventoryItem from '../../src/modules/inventory/inventoryItem.model.js';
import Supply from '../../src/modules/supply/supply.model.js';

export async function seedTestData() {
  await connectTestDb();
  await clearTestDb();

  console.log('🌱 Seeding test data...');

  try {
    // 1. Create Coordinators
    const coordinator1Data = await createTestCoordinator({
      userName: 'coordinator1',
      email: 'coordinator1@test.com',
      displayName: 'Coordinator One',
      phoneNumber: '0901000001',
    });
    const coordinator2Data = await createTestCoordinator({
      userName: 'coordinator2',
      email: 'coordinator2@test.com',
      displayName: 'Coordinator Two',
      phoneNumber: '0901000002',
    });
    const coordinator3Data = await createTestCoordinator({
      userName: 'coordinator3',
      email: 'coordinator3@test.com',
      displayName: 'Coordinator Three',
      phoneNumber: '0901000003',
    });

    const [coordinator1, coordinator2, coordinator3] = await User.insertMany([
      coordinator1Data,
      coordinator2Data,
      coordinator3Data,
    ]);

    console.log('✅ Created 3 coordinators');

    // 2. Create Citizens
    const citizenDataList = await Promise.all([
      createTestCitizen({ userName: 'citizen1', email: 'citizen1@test.com', displayName: 'Citizen One', phoneNumber: '0902000001' }),
      createTestCitizen({ userName: 'citizen2', email: 'citizen2@test.com', displayName: 'Citizen Two', phoneNumber: '0902000002' }),
      createTestCitizen({ userName: 'citizen3', email: 'citizen3@test.com', displayName: 'Citizen Three', phoneNumber: '0902000003' }),
      createTestCitizen({ userName: 'citizen4', email: 'citizen4@test.com', displayName: 'Citizen Four', phoneNumber: '0902000004' }),
      createTestCitizen({ userName: 'citizen5', email: 'citizen5@test.com', displayName: 'Citizen Five', phoneNumber: '0902000005' }),
    ]);

    const citizens = await User.insertMany(citizenDataList);
    console.log('✅ Created 5 citizens');

    // 3. Create Teams (without members first)
    const team1Data = createTestTeam(null, { name: 'Alpha Team', specialization: 'RELIEF' });
    const team2Data = createTestTeam(null, { name: 'Bravo Team', specialization: 'RELIEF' });
    const team3Data = createTestTeam(null, { name: 'Charlie Team', specialization: 'RESCUE' });
    const team4Data = createTestTeam(null, { name: 'Delta Team', specialization: 'RELIEF' });

    const [team1, team2, team3, team4] = await Team.insertMany([
      team1Data,
      team2Data,
      team3Data,
      team4Data,
    ]);

    console.log('✅ Created 4 teams');

    // 4. Create Team Members
    const team1Members = await Promise.all([
      createTestTeamMember(team1._id, { userName: 'team1_member1', email: 'team1_member1@test.com', displayName: 'Team1 Member 1', phoneNumber: '0903000001' }),
      createTestTeamMember(team1._id, { userName: 'team1_member2', email: 'team1_member2@test.com', displayName: 'Team1 Member 2', phoneNumber: '0903000002' }),
      createTestTeamMember(team1._id, { userName: 'team1_leader', email: 'team1_leader@test.com', displayName: 'Team1 Leader', phoneNumber: '0903000003' }),
    ]);

    const team2Members = await Promise.all([
      createTestTeamMember(team2._id, { userName: 'team2_member1', email: 'team2_member1@test.com', displayName: 'Team2 Member 1', phoneNumber: '0903000004' }),
      createTestTeamMember(team2._id, { userName: 'team2_member2', email: 'team2_member2@test.com', displayName: 'Team2 Member 2', phoneNumber: '0903000005' }),
      createTestTeamMember(team2._id, { userName: 'team2_leader', email: 'team2_leader@test.com', displayName: 'Team2 Leader', phoneNumber: '0903000006' }),
    ]);

    const team3Members = await Promise.all([
      createTestTeamMember(team3._id, { userName: 'team3_member1', email: 'team3_member1@test.com', displayName: 'Team3 Member 1', phoneNumber: '0903000007' }),
      createTestTeamMember(team3._id, { userName: 'team3_leader', email: 'team3_leader@test.com', displayName: 'Team3 Leader', phoneNumber: '0903000008' }),
    ]);

    const team4Members = await Promise.all([
      createTestTeamMember(team4._id, { userName: 'team4_member1', email: 'team4_member1@test.com', displayName: 'Team4 Member 1', phoneNumber: '0903000009' }),
      createTestTeamMember(team4._id, { userName: 'team4_member2', email: 'team4_member2@test.com', displayName: 'Team4 Member 2', phoneNumber: '0903000010' }),
      createTestTeamMember(team4._id, { userName: 'team4_leader', email: 'team4_leader@test.com', displayName: 'Team4 Leader', phoneNumber: '0903000011' }),
    ]);

    const allTeamMembers = await User.insertMany([
      ...team1Members,
      ...team2Members,
      ...team3Members,
      ...team4Members,
    ]);

    console.log('✅ Created team members');

    // 5. Update teams with leaders and member IDs
    const team1Leader = allTeamMembers.find(m => m.userName === 'team1_leader');
    const team2Leader = allTeamMembers.find(m => m.userName === 'team2_leader');
    const team3Leader = allTeamMembers.find(m => m.userName === 'team3_leader');
    const team4Leader = allTeamMembers.find(m => m.userName === 'team4_leader');

    await Team.findByIdAndUpdate(team1._id, {
      leaderId: team1Leader._id,
      memberIds: allTeamMembers.filter(m => m.teamId?.toString() === team1._id.toString()).map(m => m._id),
    });

    await Team.findByIdAndUpdate(team2._id, {
      leaderId: team2Leader._id,
      memberIds: allTeamMembers.filter(m => m.teamId?.toString() === team2._id.toString()).map(m => m._id),
    });

    await Team.findByIdAndUpdate(team3._id, {
      leaderId: team3Leader._id,
      memberIds: allTeamMembers.filter(m => m.teamId?.toString() === team3._id.toString()).map(m => m._id),
    });

    await Team.findByIdAndUpdate(team4._id, {
      leaderId: team4Leader._id,
      memberIds: allTeamMembers.filter(m => m.teamId?.toString() === team4._id.toString()).map(m => m._id),
    });

    console.log('✅ Updated teams with leaders and members');

    // 6. Create Warehouses
    const warehouse1Data = createTestWarehouse(coordinator1._id, {
      name: 'Central Warehouse',
      location: {
        type: 'Point',
        coordinates: [106.660172, 10.762622],
      },
    });

    const warehouse2Data = createTestWarehouse(coordinator2._id, {
      name: 'North Warehouse',
      location: {
        type: 'Point',
        coordinates: [106.670000, 10.800000],
      },
    });

    const [warehouse1, warehouse2] = await Warehouse.insertMany([
      warehouse1Data,
      warehouse2Data,
    ]);

    console.log('✅ Created 2 warehouses');

    // 7. Create Supplies
    const waterSupply = await Supply.create({
      name: 'Water',
      nameNormalized: 'water',
      category: 'WATER',
      unit: 'L',
      unitWeight: 1,
      description: 'Drinking water',
      isActive: true,
      createdBy: coordinator1._id,
    });

    const riceSupply = await Supply.create({
      name: 'Rice',
      nameNormalized: 'rice',
      category: 'FOOD',
      unit: 'kg',
      unitWeight: 1,
      description: 'Rice',
      isActive: true,
      createdBy: coordinator1._id,
    });

    console.log('✅ Created supplies');

    // 8. Create Inventory Items
    const inventoryItems = await InventoryItem.insertMany([
      {
        itemType: 'SUPPLY',
        supplyID: waterSupply._id,
        warehouse: warehouse1._id,
        description: 'Water inventory at Central Warehouse',
        quantity: 1000,
        reservedQuantity: 0,
        unit: 'L',
        status: 'ACTIVE',
      },
      {
        itemType: 'SUPPLY',
        supplyID: riceSupply._id,
        warehouse: warehouse1._id,
        description: 'Rice inventory at Central Warehouse',
        quantity: 500,
        reservedQuantity: 0,
        unit: 'kg',
        status: 'ACTIVE',
      },
      {
        itemType: 'SUPPLY',
        supplyID: waterSupply._id,
        warehouse: warehouse2._id,
        description: 'Water inventory at North Warehouse',
        quantity: 800,
        reservedQuantity: 0,
        unit: 'L',
        status: 'ACTIVE',
      },
      {
        itemType: 'SUPPLY',
        supplyID: riceSupply._id,
        warehouse: warehouse2._id,
        description: 'Rice inventory at North Warehouse',
        quantity: 300,
        reservedQuantity: 0,
        unit: 'kg',
        status: 'ACTIVE',
      },
    ]);

    console.log('✅ Created inventory items');

    console.log('\n🎉 Test data seeding completed!\n');

    return {
      coordinators: [coordinator1, coordinator2, coordinator3],
      citizens,
      teams: [team1, team2, team3, team4],
      teamMembers: allTeamMembers,
      warehouses: [warehouse1, warehouse2],
      supplies: { water: waterSupply, rice: riceSupply },
      inventoryItems,
    };
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
