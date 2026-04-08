import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import {
  getUploadSignature,
  getOptimizedImageUrl,
  deleteImage,
} from "./cloudinary.controller.js";

const router = express.Router();

router.post("/signature", authenticate, getUploadSignature);

router.get("/url/:publicId", getOptimizedImageUrl);

router.delete("/:publicId", authenticate, deleteImage);

export default router;
