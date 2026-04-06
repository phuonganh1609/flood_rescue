import { cloudinaryService } from "./cloudinary.service.js";
import { signatureRequestSchema } from "./cloudinary.validation.js";
import response from "../../utils/response.js";

export const getUploadSignature = async (req, res) => {
  try {
    const { error, value } = signatureRequestSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));
      return response.sendError(res, {
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    }

    const { folder, context, eager } = value;
    const userId = req.user.id;

    const enrichedContext = {
      ...context,
      userId,
      uploadedBy: req.user.fullName || req.user.username,
    };

    const signature = cloudinaryService.generateUploadSignature({
      folder: `${folder}`,
      context: enrichedContext,
      resourceType: "image",
      eager,
    });

    return response.sendSuccess(res, {
      data: signature,
      message: "Signature generated successfully",
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message || "Failed to generate signature",
      statusCode: 500,
    });
  }
};

export const getOptimizedImageUrl = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { transformation = "medium" } = req.query;

    if (!publicId) {
      return response.sendError(res, {
        message: "publicId is required",
        statusCode: 400,
      });
    }

    const url = cloudinaryService.getOptimizedUrl(publicId, transformation);

    return response.sendSuccess(res, {
      data: { url },
      message: "URL generated successfully",
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message || "Failed to generate URL",
      statusCode: 500,
    });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return response.sendError(res, {
        message: "publicId is required",
        statusCode: 400,
      });
    }

    const result = await cloudinaryService.deleteAsset(publicId);

    return response.sendSuccess(res, {
      data: result,
      message: "Image deleted successfully",
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message || "Failed to delete image",
      statusCode: 500,
    });
  }
};
