// validations/missionSupply.validation.js
import { MISSION_SUPPLY_STATUS } from "./missionSupply.model.js";

export const validateMissionSupplyQuery = (req, res, next) => {
  const { missionId, status } = req.query;
  const MONGODB_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
  const VALID_STATUSES = Object.values(MISSION_SUPPLY_STATUS);

  if (missionId && !MONGODB_OBJECT_ID_REGEX.test(missionId)) {
    return res.status(400).json({ message: "Invalid missionId format" });
  }

  if (status) {
    const statusFilters = Array.isArray(status) ? status : status.split(",");
    const invalid = statusFilters.filter(s => !VALID_STATUSES.includes(s.trim()));
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid status: ${invalid.join(", ")}` });
    }
  }

  next();
};