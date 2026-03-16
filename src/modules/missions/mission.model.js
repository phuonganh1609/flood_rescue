import mongoose from "mongoose";

const missionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      unique: true,
    },
    description: String,
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PLANNED",
        "IN_PROGRESS",
        "PAUSED",
        "PARTIAL",
        "COMPLETED",
        "ABORTED",
      ],
      default: "DRAFT",
    },
    priority: {
      type: String,
      enum: ["Critical", "High", "Normal"],
      default: "Normal",
    },
    type: {
      type: String,
      enum: ["RESCUE", "RELIEF"],
      required: true,
    },
    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

missionSchema.pre("save", async function () {
  if (!this.code) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${day}${month}${year}`;

    const prefix = `MS-${dateStr}`;

    const MissionModel = mongoose.model("Mission");

    const lastMission = await MissionModel.findOne({
      code: new RegExp(`^${prefix}`),
    }).sort({ code: -1 });

    let sequence = 1;
    if (lastMission && lastMission.code) {
      const parts = lastMission.code.split("-");
      const lastSeq = parseInt(parts[2]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    this.code = `${prefix}-${String(sequence).padStart(3, "0")}`;
  }
});

const Mission = mongoose.model("Mission", missionSchema);
export default Mission;
