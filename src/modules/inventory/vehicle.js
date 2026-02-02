import mongoose from "mongoose";
const { Schema } = mongoose;

const VehicleSchema = new Schema(
  {
    vehicleType: {
        type: String,
        required: true,
        enum: ["Boat", "Truck", "Helicopter", "Car", "Motorbike"],
    },
    // Biển số
    licensePlate: { 
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ["Available", "In Use", "Under Maintenance"],
        default: "Available",
    },
    location: {
        type: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
        },
        required: true,
    },
    assignedTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
    },
  },
  { timestamps: true },
);
export default mongoose.model("Vehicle", VehicleSchema);