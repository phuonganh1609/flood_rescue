import cloudinary from "./cloudinary.config.js";
import { EAGER_TRANSFORMATIONS } from "./cloudinary.constants.js";

export const generateUploadSignature = ({
  folder,
  context,
  resourceType = "image",
  eager = false,
}) => {
  const timestamp = Math.round(Date.now() / 1000);

  const params = {
    folder,
    timestamp,
    resource_type: resourceType,
  };

  if (context && Object.keys(context).length > 0) {
    params.context = Object.entries(context)
      .map(([k, v]) => `${k}=${v}`)
      .join("|");
  }

  if (eager) {
    params.eager = EAGER_TRANSFORMATIONS.map((t) => {
      const parts = [];
      if (t.width) parts.push(`w_${t.width}`);
      if (t.height) parts.push(`h_${t.height}`);
      if (t.crop) parts.push(`c_${t.crop}`);
      if (t.quality) parts.push(`q_${t.quality}`);
      if (t.fetch_format) parts.push(`f_${t.fetch_format}`);
      return parts.join(",");
    }).join("|");
    params.eager_async = true;
  }

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    resourceType,
    ...(context && { context }),
    ...(eager && { eager: params.eager, eager_async: true }),
  };
};

export const getOptimizedUrl = (publicId, transformation = "medium") => {
  if (!publicId) {
    throw new Error("publicId is required");
  }

  const transformations = {
    thumbnail: { width: 300, height: 300, crop: "fill", quality: "auto:low" },
    medium: { width: 800, height: 800, crop: "limit", quality: "auto:good" },
    avatar: {
      width: 200,
      height: 200,
      crop: "fill",
      gravity: "face",
      quality: "auto",
    },
  };

  const transform = transformations[transformation] || transformations.medium;

  return cloudinary.url(publicId, {
    ...transform,
    fetch_format: "auto",
    secure: true,
  });
};

export const deleteAsset = async (publicId) => {
  if (!publicId) {
    throw new Error("publicId is required for deletion");
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete asset: ${error.message}`);
  }
};

export const validateUploadResult = (cloudinaryResponse) => {
  if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
    throw new Error("Invalid Cloudinary upload response");
  }

  return {
    publicId: cloudinaryResponse.public_id,
    secureUrl: cloudinaryResponse.secure_url,
    format: cloudinaryResponse.format,
    width: cloudinaryResponse.width,
    height: cloudinaryResponse.height,
    bytes: cloudinaryResponse.bytes,
    resourceType: cloudinaryResponse.resource_type,
    createdAt: cloudinaryResponse.created_at,
    ...(cloudinaryResponse.eager && {
      thumbnailUrl: cloudinaryResponse.eager[0]?.secure_url,
    }),
  };
};

export const cloudinaryService = {
  generateUploadSignature,
  getOptimizedUrl,
  deleteAsset,
  validateUploadResult,
};
