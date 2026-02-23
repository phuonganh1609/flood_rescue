import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String, //link CDN để hiển thị ảnh
    },
    avatarId: {
      type: String, //Cloudinary public_id để xóa ảnh
    },
    isActive: {
      type: Boolean,
      default: true,
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
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", UserSchema);
