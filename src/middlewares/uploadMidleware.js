import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadUserFile } from "../config/cloudinary.js";

const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

export const uploadRequestMedia = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Chỉ cho phép upload ảnh"));
    }
    cb(null, true);
  },
});

export const uploadFileForUser = async ({ userId, scope, refId, file }) => {
  const res = await uploadUserFile({
    filePath: file.path,
    userId,
    scope,
    refId,
  });

  // ❗ xoá file local sau khi upload
  fs.unlinkSync(file.path);

  return {
    asset_id: res.asset_id,
    public_id: res.public_id,
    resource_type: res.resource_type,
    format: res.format,
    bytes: res.bytes,
    width: res.width,
    height: res.height,
    secure_url: res.secure_url,
    created_at: res.created_at,
    user_id: userId,
    scope,
    ref_id: refId,
  };
};
