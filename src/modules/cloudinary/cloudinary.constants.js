export const FOLDERS = {
  RESCUE_REQUESTS: "rescue_requests",
  MISSIONS: "missions",
  USERS: "users",
  TEAMS: "teams",
  WAREHOUSE: "warehouse",
};

export const TRANSFORMATIONS = {
  THUMBNAIL: {
    width: 300,
    height: 300,
    crop: "fill",
    quality: "auto:low",
    fetch_format: "auto",
  },
  MEDIUM: {
    width: 800,
    height: 800,
    crop: "limit",
    quality: "auto:good",
    fetch_format: "auto",
  },
  AVATAR: {
    width: 200,
    height: 200,
    crop: "fill",
    gravity: "face",
    quality: "auto",
    fetch_format: "auto",
  },
};

export const UPLOAD_PRESETS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_FORMATS: ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif"],
  RESOURCE_TYPE: "image",
};

export const EAGER_TRANSFORMATIONS = [
  {
    width: 300,
    height: 300,
    crop: "fill",
    quality: "auto:low",
    fetch_format: "auto",
  },
  {
    width: 800,
    height: 800,
    crop: "limit",
    quality: "auto:good",
    fetch_format: "auto",
  },
];
