import mongoose from "mongoose";
const { Schema } = mongoose;

// --- Enums ---
export const REQUEST_STATUS = {
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  IN_PROGRESS: "IN_PROGRESS",
  PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
  FULFILLED: "FULFILLED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
};

export const REQUEST_PRIORITY = {
  CRITICAL: "Critical",
  HIGH: "High",
  NORMAL: "Normal",
};

export const TERMINAL_STATUSES = [
  REQUEST_STATUS.CLOSED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.REJECTED,
];

// --- Sub-schemas ---
const MediaSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const RequestSupplySchema = new Schema(
  {
    supplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supply",
      required: true,
    },
    requestedQty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

// --- Main schema ---
const RequestSchema = new Schema(
  {
    userName: { type: String, required: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for unregistered citizens
    },

    // Who actually created this request
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    source: {
      type: String,
      enum: ["CITIZEN", "COORDINATOR"],
      default: "CITIZEN",
    },

    // Phone number of the requester (from User or manual input)
    phoneNumber: { type: String, default: null },

    type: {
      type: String,
      enum: ["Rescue", "Relief"],
      required: true,
    },

    incidentType: {
      type: String,
      enum: ["Flood", "Trapped", "Injured", "Landslide", "Other"],
      default: "Other",
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

    description: { type: String, required: true },

    peopleCount: {
      type: Number,
      min: 1,
      max: 100,
      default: 1,
    },

    priority: {
      type: String,
      enum: Object.values(REQUEST_PRIORITY),
      default: REQUEST_PRIORITY.NORMAL,
    },

    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.SUBMITTED,
    },

    requestSupplies: {
      type: [RequestSupplySchema],
      default: [],
    },

    media: {
      type: [MediaSchema],
      default: [],
    },

    // Duplicate detection
    isDuplicated: { type: Boolean, default: false },
    duplicatedOfRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null,
    },

    // Location verification
    isLocationVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// GeoJSON index for spatial queries
RequestSchema.index({ location: "2dsphere" });

// Priority sorting index (for coordinator dashboard)
RequestSchema.index({ status: 1, priority: 1, peopleCount: -1, createdAt: 1 });

export default mongoose.model("Request", RequestSchema);
