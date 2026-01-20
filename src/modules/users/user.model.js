import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        "Citizen",
        "Rescue Team",
        "Rescue Coordinator",
        "Admin",
        "Manager",
      ],
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", UserSchema);
