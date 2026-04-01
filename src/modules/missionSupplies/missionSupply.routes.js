import express from "express";
import MissionSupply from "./missionSupply.model.js";
import { MISSION_SUPPLY_STATUS } from "./missionSupply.model.js";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import response from "../../utils/response.js";
import paginationUtils from "../../utils/pagination.js";

const router = express.Router();
const VALID_MISSION_SUPPLY_STATUSES = Object.values(MISSION_SUPPLY_STATUS);
const MONGODB_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const parseStatusQuery = (statusQuery) => {
  if (statusQuery === undefined || statusQuery === null) return [];

  const rawValues = Array.isArray(statusQuery) ? statusQuery : [statusQuery];

  return [...new Set(
    rawValues
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  )];
};

// GET /mission-supplies?missionId={id?}&status={status|status1,status2}&page={n?}&limit={n?}
router.get(
  "/",
  authenticate,
  authorize(["Rescue Team", "Manager", "Admin", "Rescue Coordinator"]),
  async (req, res) => {
    try {
      const { missionId: missionIdQuery, status, page, limit } = req.query;
      const missionId = typeof missionIdQuery === "string"
        ? missionIdQuery.trim()
        : missionIdQuery;
      const statusFilters = parseStatusQuery(status);

      if (
        missionId &&
        (!MONGODB_OBJECT_ID_REGEX.test(missionId) || typeof missionId !== "string")
      ) {
        return response.sendError(res, {
          message: "Invalid query param: missionId must be a valid ObjectId",
          statusCode: 400,
          errorCode: "INVALID_MISSION_ID",
        });
      }

      const invalidStatuses = statusFilters.filter(
        (item) => !VALID_MISSION_SUPPLY_STATUSES.includes(item),
      );

      if (invalidStatuses.length > 0) {
        return response.sendError(res, {
          message: `Invalid status value(s): ${invalidStatuses.join(", ")}. Allowed: ${VALID_MISSION_SUPPLY_STATUSES.join(", ")}`,
          statusCode: 400,
          errorCode: "INVALID_STATUS_FILTER",
        });
      }

      const filter = {};
      if (missionId) {
        filter.missionId = missionId;
      }

      if (statusFilters.length === 1) {
        filter.status = statusFilters[0];
      } else if (statusFilters.length > 1) {
        filter.status = { $in: statusFilters };
      }

      const usePagination = page !== undefined || limit !== undefined;
      let meta = null;

      const queryBuilder = MissionSupply.find(filter)
        .populate("missionId", "name code status type priority")
        .populate("supplyId", "name unit category")
        .populate("warehouseId", "name location status");

      if (usePagination) {
        const { page: currentPage, limit: currentLimit, skip } =
          paginationUtils.getPaginationParams(req.query);

        const total = await MissionSupply.countDocuments(filter);

        queryBuilder.skip(skip).limit(currentLimit);

        meta = paginationUtils.buildPaginationMeta({
          page: currentPage,
          limit: currentLimit,
          total,
        });
      }

      const data = await queryBuilder.sort({ createdAt: 1 });

      return response.sendSuccess(res, {
        data,
        message: "Mission supplies fetched successfully",
        meta,
      });
    } catch (error) {
      return response.sendError(res, {
        message: error.message,
        statusCode: 500,
        errorCode: "GET_MISSION_SUPPLIES_FAILED",
      });
    }
  },
);

export default router;
