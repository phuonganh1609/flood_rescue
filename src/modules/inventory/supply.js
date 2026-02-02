import mongoose from "mongoose";
const { Schema } = mongoose;

const SupplySchema = new Schema(
  {
    supplyType: {
        type: String,
        required: true,
        enum: ["Food", "Water", "Medical", "Clothing", "Shelter"],
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["Available", "Deployed", "Out of Stock"],
        default: "Available",
    },
    location: {
        type: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
        },
        required: true,
    },
  },
  { timestamps: true },
);
export default mongoose.model("Supply", SupplySchema);