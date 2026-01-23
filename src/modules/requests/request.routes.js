import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { uploadRequestMedia } from "../../middlewares/uploadMidleware.js";
import { addRequest } from "./request.controller.js";

const router = express.Router();

router.post(
  "/addRequest",
  authenticate,
  uploadRequestMedia.array("images", 5),
  addRequest
);

export default router;
