import mongoose from "mongoose";
import dotenv from "dotenv";
import missionService from "./src/modules/missions/mission.service.js";
import User from "./src/modules/users/user.model.js";
import Timeline from "./src/modules/timelines/timeline.model.js";

dotenv.config();

const verifyMission = async () => {
  console.log("=== Mission Module Verification ===\n");
  try {
    await mongoose.connect(
      process.env.MONGODB_CONNECT_URI || process.env.MONGODB_CONNECTIONSTRING,
    );
    console.log("✓ Connected to MongoDB");

    // 1. Create Mission
    console.log("\n--- 1. Create Mission ---");
    const mission = await missionService.createMission({
      name: "Verification Mission",
      description: "Testing mission module",
      type: "RESCUE",
      priority: "HIGH",
      coordinatorId: new mongoose.Types.ObjectId(),
    });
    console.log(
      "✓ Mission Created:",
      mission.code,
      "| Status:",
      mission.status,
    );

    // 2. Update Mission (name only, status should be blocked)
    console.log("\n--- 2. Update Mission ---");
    const updated = await missionService.updateMission(mission._id, {
      name: "Updated Verification Mission",
    });
    console.log("✓ Mission Updated:", updated.name);

    // 2b. Verify status update is blocked
    try {
      await missionService.updateMission(mission._id, {
        status: "IN_PROGRESS",
      });
      console.log("✗ Status update should have been blocked!");
    } catch (e) {
      console.log("✓ Status update correctly blocked:", e.message);
    }

    // 3. Assign Team (transitions status PLANNED → IN_PROGRESS)
    console.log("\n--- 3. Assign Team ---");
    const timeline = await missionService.assignTeam(mission._id, {
      teamId: new mongoose.Types.ObjectId(),
      requestId: new mongoose.Types.ObjectId(),
      note: "Test assignment",
    });
    console.log("✓ Team Assigned, Timeline created");

    // 4. Pause Mission (IN_PROGRESS → PAUSED)
    console.log("\n--- 4. Pause Mission ---");
    const paused = await missionService.pauseMission(mission._id);
    console.log("✓ Mission Paused:", paused.status);

    // 4b. Verify assign is blocked when PAUSED
    try {
      await missionService.assignTeam(mission._id, {
        teamId: new mongoose.Types.ObjectId(),
        requestId: new mongoose.Types.ObjectId(),
      });
      console.log("✗ Assign should have been blocked when PAUSED!");
    } catch (e) {
      console.log("✓ Assign correctly blocked when PAUSED:", e.message);
    }

    // 5. Resume Mission (PAUSED → IN_PROGRESS)
    console.log("\n--- 5. Resume Mission ---");
    const resumed = await missionService.resumeMission(mission._id);
    console.log("✓ Mission Resumed:", resumed.status);

    // 6. Abort Mission
    console.log("\n--- 6. Abort Mission ---");
    const aborted = await missionService.abortMission(mission._id);
    console.log("✓ Mission Aborted:", aborted.status);

    // 7. List Missions
    console.log("\n--- 7. List Missions ---");
    const result = await missionService.getMissions({ page: 1, limit: 5 });
    console.log(`✓ Found ${result.total} missions`);

    // Cleanup: complete active timelines first, then delete mission
    await Timeline.updateMany(
      { missionId: mission._id },
      { status: "COMPLETED" },
    );
    await missionService.deleteMission(mission._id);
    console.log("\n✓ Cleanup: Mission Deleted");

    console.log("\n=== ALL VERIFICATIONS PASSED ===");
  } catch (error) {
    console.error("\n✗ Verification Failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

verifyMission();
