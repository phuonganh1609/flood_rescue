import mongoose from "mongoose";
const { Schema } = mongoose;

// --- Enums ---
export const SUPPLY_STATUS = {
  SUBMITTED: "SUBMITTED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
};

const SupplySchema = new Schema(
    
  {
    
    name: {
         type: String, 
         unique: true,
         required: true 
    },
    category: { 
        type: String, 
        enum: ['FOOD', 'WATER', 'MEDICAL', 'CLOTHING', 'EQUIPMENT', 'OTHER'],
        required: true 
    },
    unit: { 
        type: String, 
        required: true 
    },
    unitWeight: { 
        type: Number, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: Object.values(SUPPLY_STATUS), 
        default: SUPPLY_STATUS.SUBMITTED 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
  },
  { timestamps: true },
);
export default mongoose.model("Supply", SupplySchema); 