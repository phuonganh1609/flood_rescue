import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { teamStatsService } from './src/modules/teams/team.stats.service.js';

dotenv.config();

async function test() {
  try {
    console.log("Connecting to DB: ");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");
    
    // Just grab any team to test
    const db = mongoose.connection.db;
    const team = await db.collection('teams').findOne({});
    if (!team) {
      console.log("No team found to test");
      process.exit(0);
    }
    
    console.log("Testing with team: ");
    
    console.log("\n--- getTeamStatistics ---");
    const stats = await teamStatsService.getTeamStatistics(team._id.toString());
    console.log(stats);
    
    console.log("\n--- getRescueTrends (week) ---");
    const trendsWeek = await teamStatsService.getRescueTrends(team._id.toString(), 'week');
    console.log(trendsWeek);
    
    console.log("\n--- getRescueTrends (month) ---");
    const trendsMonth = await teamStatsService.getRescueTrends(team._id.toString(), 'month');
    console.log(trendsMonth);

    console.log("\n--- getRescueTrends (year) ---");
    const trendsYear = await teamStatsService.getRescueTrends(team._id.toString(), 'year');
    console.log(trendsYear);
    
  } catch (e) {
    console.error("Test failed: ");
  } finally {
    await mongoose.disconnect();
  }
}

test();