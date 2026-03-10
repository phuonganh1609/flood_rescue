import mongoose from "mongoose";
const { Schema } = mongoose;

// --- Enums ---
export const VEHICLE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
  OUT_OF_SERVICE: "OUT OF SERVICE",
};

export const VEHICLE_TYPE = {
  AMBULANCE: "AMBULANCE",
  RESCUE_BOAT: "RESCUE BOAT",
  FIRE_TRUCK: "FIRE TRUCK",
  TRUCK: "TRUCK",
  VAN: "VAN",
  MOTORCYCLE: "MOTORCYCLE",
  OTHERS: "OTHERS",
};

const VehicleSchema = new Schema(
  {
    licensePlate: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: Object.values(VEHICLE_TYPE),
      required: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      required: false,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    capacityUnit: {
      type: String,
      enum: ["PERSONS", "LITERS", "TONS", "KG"],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(VEHICLE_STATUS),
      default: "ACTIVE",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    currentMission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
    },
    lastMaintenanceDate: {
      type: Date,
      required: false,
    },
    maintenanceInterval: {
      type: Number,
      required: false,
      default: 90,
    },
    description: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", VehicleSchema);
