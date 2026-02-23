import Request from "./request.model.js";
import { TERMINAL_STATUSES, REQUEST_STATUS } from "./request.model.js";

/**
 * Priority sort order map (for MongoDB sort)
 * Critical = 1 (highest), High = 2, Normal = 3 (lowest)
 */
const PRIORITY_ORDER = { Critical: 1, High: 2, Normal: 3 };

/**
 * Repository for Request operations
 */
class RequestRepository {
  /**
   * Create a new request
   */
  async createRequest(requestData) {
    const request = new Request(requestData);
    return await request.save();
  }

  /**
   * Find request by ID
   */
  async findRequestById(requestId) {
    return await Request.findById(requestId).populate(
      "userId",
      "displayName userName email phoneNumber",
    );
  }

  /**
   * Check if user has an active (non-terminal) request
   * @returns {Promise<Object|null>} the active request, or null if none
   */
  async findActiveRequest(userId) {
    return await Request.findOne({
      userId,
      status: { $nin: TERMINAL_STATUSES },
    });
  }

  /**
   * Find all requests with pagination + priority sorting
   */
  async findAllRequests(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const requests = await Request.find(filter)
      .populate("userId", "displayName userName email phoneNumber")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Request.countDocuments(filter);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find all requests sorted by priority (for coordinator dashboard)
   */
  async findAllRequestsPrioritized(
    filter = {},
    pagination = { page: 1, limit: 10 },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Use aggregation for custom priority sort order
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          priorityOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "Critical"] }, then: 1 },
                { case: { $eq: ["$priority", "High"] }, then: 2 },
              ],
              default: 3,
            },
          },
        },
      },
      { $sort: { priorityOrder: 1, peopleCount: -1, createdAt: 1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { priorityOrder: 0 } }, // remove helper field
    ];

    const [requests, countResult] = await Promise.all([
      Request.aggregate(pipeline),
      Request.countDocuments(filter),
    ]);

    // Populate userId after aggregation
    const populated = await Request.populate(requests, {
      path: "userId",
      select: "displayName userName email phoneNumber",
    });

    return {
      data: populated,
      total: countResult,
      page,
      limit,
      totalPages: Math.ceil(countResult / limit),
    };
  }

  /**
   * Find requests by user with pagination
   */
  async findRequestsByUser(
    userId,
    filter = {},
    pagination = { page: 1, limit: 10 },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const criteria = { userId, ...filter };

    const requests = await Request.find(criteria)
      .populate("userId", "displayName userName email phoneNumber")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Request.countDocuments(criteria);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Generic update
   */
  async updateRequest(requestId, updateData) {
    return await Request.findByIdAndUpdate(requestId, updateData, {
      new: true,
    }).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Update request status only
   */
  async updateRequestStatus(requestId, status) {
    return await Request.findByIdAndUpdate(
      requestId,
      { status },
      { new: true },
    ).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Verify request → set status + priority
   */
  async verifyRequest(requestId, { status, priority, reason }) {
    const update = { status };
    if (priority) update.priority = priority;
    if (reason) update.rejectionReason = reason;

    return await Request.findByIdAndUpdate(requestId, update, {
      new: true,
    }).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Mark request as duplicate and sync status/priority from original
   */
  async markAsDuplicate(
    requestId,
    duplicatedOfRequestId,
    { status, priority },
  ) {
    return await Request.findByIdAndUpdate(
      requestId,
      {
        isDuplicated: true,
        duplicatedOfRequestId,
        status,
        priority,
      },
      { new: true },
    ).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Update priority only
   */
  async updatePriority(requestId, priority) {
    return await Request.findByIdAndUpdate(
      requestId,
      { priority },
      { new: true },
    ).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Update location and verification flag
   */
  async updateLocation(requestId, location, isLocationVerified = true) {
    return await Request.findByIdAndUpdate(
      requestId,
      { location, isLocationVerified },
      { new: true },
    ).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Delete request
   */
  async deleteRequest(requestId) {
    return await Request.findByIdAndDelete(requestId);
  }
}

const requestRepository = new RequestRepository();

export { requestRepository };
