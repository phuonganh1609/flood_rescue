import mongoose from "mongoose";
const { Schema } = mongoose;

const missionSchema = new Schema({

  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ["Critical", "High", "Normal"], required: true },
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

});
export default mongoose.model("Mission", missionSchema);