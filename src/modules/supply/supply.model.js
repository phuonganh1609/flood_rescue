import mongoose from "mongoose";
const { Schema } = mongoose;

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
    isActive: { 
        type: Boolean, 
        default: true 
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
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