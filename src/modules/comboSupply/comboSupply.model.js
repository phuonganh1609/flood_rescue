import mongoose from "mongoose";
const { Schema } = mongoose;

const ComboSupplySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    incidentType: {
      type: String,
      enum: ["Flood", "Trapped", "Injured", "Landslide", "Other"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    supplies: [
      {
        supplyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supply",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ComboSupply", ComboSupplySchema);
