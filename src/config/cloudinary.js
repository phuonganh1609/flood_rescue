import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadUserFile = async ({ filePath, userId, scope, refId }) => {
  return await cloudinary.uploader.upload(filePath, {
    folder: `users/${userId}/${scope}/${refId}`,
    resource_type: "auto",
  });
};

export default cloudinary;
