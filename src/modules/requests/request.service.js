import { authRepository } from "../auth/auth.repository.js";
import { requestRepository } from "./request.repository.js";
import { REQUEST_STATUS, TERMINAL_STATUSES } from "./request.model.js";
import { eventBus } from "../../utils/events.js";

/**
 * Allowed state transitions for the Request state machine (Unified Flow 2.2)
 *
 * Note: Some transitions (VERIFIED → IN_PROGRESS, IN_PROGRESS → FULFILLED, etc.)
 * will be triggered by the Timeline/Mission modules in the future.
 * They are defined here so the state machine is complete.
 */
const ALLOWED_TRANSITIONS = {
  [REQUEST_STATUS.SUBMITTED]: [
    REQUEST_STATUS.VERIFIED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.VERIFIED]: [REQUEST_STATUS.IN_PROGRESS],
  [REQUEST_STATUS.IN_PROGRESS]: [
    REQUEST_STATUS.PARTIALLY_FULFILLED,
    REQUEST_STATUS.FULFILLED,
  ],
  [REQUEST_STATUS.PARTIALLY_FULFILLED]: [
    REQUEST_STATUS.IN_PROGRESS,
    REQUEST_STATUS.CLOSED,
  ],
  [REQUEST_STATUS.FULFILLED]: [REQUEST_STATUS.CLOSED],
  // Terminal states
  [REQUEST_STATUS.REJECTED]: [],
  [REQUEST_STATUS.CLOSED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
};

/**
 * Validate a status transition
 * @throws {Error} if transition is invalid
 */
function assertTransition(currentStatus, newStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
        `Allowed: ${allowed?.join(", ") || "none"}`,
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Service for Request operations
 */
class RequestService {
  /**
   * Create a new request (Citizen self-service)
   * Validates: 1 active request per Citizen
   */
  async createRequest(userId, requestData) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      const err = new Error("User does not exist");
      err.statusCode = 404;
      throw err;
    }

    // Business rule: 1 active request per citizen
    const activeRequest = await requestRepository.findActiveRequest(userId);
    if (activeRequest) {
      const err = new Error(
        "You already have an active request. " +
          "Please wait until it is closed or cancelled before creating a new one.",
      );
      err.statusCode = 400;
      throw err;
    }

    const {
      type,
      incidentType,
      location,
      description,
      peopleCount,
      requestSupplies,
      imageUrls,
    } = requestData;

    const media = (imageUrls || []).map((url) => ({
      imageUrl: url,
      uploadedAt: new Date(),
    }));

    const newRequest = await requestRepository.createRequest({
      userId,
      userName: user.displayName || user.userName,
      phoneNumber: user.phoneNumber,
      createdBy: userId,
      source: "CITIZEN",
      type,
      incidentType: incidentType || "Other",
      location,
      description,
      peopleCount: peopleCount || 1,
      requestSupplies: requestSupplies || [],
      media,
    });

    eventBus.emit("REQUEST_SUBMITTED", {
      requestId: newRequest._id,
      userId,
    });

    return {
      message: "Request created successfully",
      data: newRequest,
    };
  }

  /**
   * Create a request on behalf of a citizen (Coordinator only)
   * - If citizenId provided: link to existing citizen, check active request
   * - If no citizenId: use userName + phoneNumber from body, userId = null
   * - Status auto-set to VERIFIED
   */
  async createRequestOnBehalf(coordinatorId, requestData) {
    const {
      citizenId,
      userName: inputUserName,
      phoneNumber: inputPhoneNumber,
      type,
      incidentType,
      location,
      description,
      peopleCount,
      priority,
      requestSupplies,
      imageUrls,
    } = requestData;

    let userId = null;
    let userName;
    let phoneNumber;

    if (citizenId) {
      // Registered citizen — validate and check active request
      const citizen = await authRepository.findUserById(citizenId);
      if (!citizen) {
        const err = new Error("Citizen not found");
        err.statusCode = 404;
        throw err;
      }
      if (citizen.role !== "Citizen") {
        const err = new Error("The specified user is not a Citizen");
        err.statusCode = 400;
        throw err;
      }

      const activeRequest =
        await requestRepository.findActiveRequest(citizenId);
      if (activeRequest) {
        const err = new Error(
          "This citizen already has an active request. " +
            "Cannot create another until the current one is closed or cancelled.",
        );
        err.statusCode = 400;
        throw err;
      }

      userId = citizenId;
      userName = citizen.displayName || citizen.userName;
      phoneNumber = citizen.phoneNumber;
    } else {
      // Unregistered citizen — use body input
      userName = inputUserName;
      phoneNumber = inputPhoneNumber;
    }

    const media = (imageUrls || []).map((url) => ({
      imageUrl: url,
      uploadedAt: new Date(),
    }));

    const newRequest = await requestRepository.createRequest({
      userId,
      userName,
      phoneNumber,
      createdBy: coordinatorId,
      source: "COORDINATOR",
      type,
      incidentType: incidentType || "Other",
      location,
      description,
      peopleCount: peopleCount || 1,
      priority: priority || "Normal",
      status: REQUEST_STATUS.VERIFIED, // auto-verified
      requestSupplies: requestSupplies || [],
      media,
    });

    // Emit both events for consistency
    eventBus.emit("REQUEST_SUBMITTED", {
      requestId: newRequest._id,
      userId: userId || coordinatorId,
    });
    eventBus.emit("REQUEST_VERIFIED", {
      requestId: newRequest._id,
      userId: userId || coordinatorId,
    });

    return {
      message: "Request created on behalf successfully",
      data: newRequest,
    };
  }

  // ─── Read ───────────────────────────────────────────────

  async getRequestById(requestId) {
    return await requestRepository.findRequestById(requestId);
  }

  async getAllRequests(filter = {}, pagination = { page: 1, limit: 10 }) {
    return await requestRepository.findAllRequests(filter, pagination);
  }

  /**
   * Get all requests sorted by priority (for coordinator dashboard)
   */
  async getAllRequestsPrioritized(
    filter = {},
    pagination = { page: 1, limit: 10 },
  ) {
    return await requestRepository.findAllRequestsPrioritized(
      filter,
      pagination,
    );
  }

  async getRequestsByUser(
    userId,
    filter = {},
    pagination = { page: 1, limit: 10 },
  ) {
    return await requestRepository.findRequestsByUser(
      userId,
      filter,
      pagination,
    );
  }

  // ─── Verify / Reject ───────────────────────────────────

  /**
   * Coordinator verifies or rejects a request
   * SUBMITTED → VERIFIED (approved=true)  or  SUBMITTED → REJECTED (approved=false)
   */
  async verifyRequest(requestId, { approved, priority, reason }) {
    const request = await this._getRequestOrThrow(requestId);

    const newStatus =
      approved ? REQUEST_STATUS.VERIFIED : REQUEST_STATUS.REJECTED;
    assertTransition(request.status, newStatus);

    const updated = await requestRepository.verifyRequest(requestId, {
      status: newStatus,
      priority: approved ? priority || request.priority : request.priority,
      reason: !approved ? reason : undefined,
    });

    const citizenId =
      request.userId._id ?
        request.userId._id.toString()
      : request.userId.toString();

    if (approved) {
      eventBus.emit("REQUEST_VERIFIED", { requestId, citizenId });
    } else {
      eventBus.emit("REQUEST_REJECTED", {
        requestId,
        citizenId,
        reason: reason || "Yêu cầu không hợp lệ",
      });
    }

    return updated;
  }

  // ─── Close ──────────────────────────────────────────────

  /**
   * Coordinator closes a request (FULFILLED → CLOSED or PARTIALLY_FULFILLED → CLOSED)
   */
  async closeRequest(requestId) {
    const request = await this._getRequestOrThrow(requestId);
    assertTransition(request.status, REQUEST_STATUS.CLOSED);

    const updated = await requestRepository.updateRequestStatus(
      requestId,
      REQUEST_STATUS.CLOSED,
    );

    eventBus.emit("REQUEST_CLOSED", { requestId });
    return updated;
  }

  // ─── Cancel ─────────────────────────────────────────────

  /**
   * Cancel a request
   * - Citizen can cancel their own SUBMITTED request
   * - Coordinator can cancel any SUBMITTED request
   * Only requests in SUBMITTED status can be cancelled.
   */
  async cancelRequest(requestId, { reason, userId, userRole }) {
    const request = await this._getRequestOrThrow(requestId);

    // Citizen can only cancel their own request
    const requestOwnerId =
      request.userId._id ?
        request.userId._id.toString()
      : request.userId.toString();

    if (userRole !== "Rescue Coordinator" && requestOwnerId !== userId) {
      const err = new Error("You can only cancel your own request");
      err.statusCode = 403;
      throw err;
    }

    // Only SUBMITTED requests can be cancelled
    if (request.status !== REQUEST_STATUS.SUBMITTED) {
      const err = new Error(
        `Cannot cancel request in ${request.status} status. Only SUBMITTED requests can be cancelled.`,
      );
      err.statusCode = 400;
      throw err;
    }

    assertTransition(request.status, REQUEST_STATUS.CANCELLED);

    const updated = await requestRepository.updateRequestStatus(
      requestId,
      REQUEST_STATUS.CANCELLED,
    );

    const citizenId = requestOwnerId;
    eventBus.emit("REQUEST_CANCELLED", {
      requestId,
      citizenId,
      reason: reason || "Request cancelled",
    });

    return updated;
  }

  // ─── Duplicate ──────────────────────────────────────────

  /**
   * Coordinator marks a request as duplicate of another request
   * Rules:
   * - Only before IN_PROGRESS (SUBMITTED or VERIFIED)
   * - Original must have isDuplicated: false (no chaining)
   * - Syncs status and priority from the original request
   */
  async markAsDuplicate(requestId, duplicatedOfRequestId) {
    const request = await this._getRequestOrThrow(requestId);

    // Only SUBMITTED or VERIFIED can be marked as duplicate
    const allowedStatuses = [REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.VERIFIED];
    if (!allowedStatuses.includes(request.status)) {
      const err = new Error(
        `Cannot mark as duplicate in ${request.status} status. Only SUBMITTED or VERIFIED requests can be marked.`,
      );
      err.statusCode = 400;
      throw err;
    }

    // Validate the original request exists
    const original = await requestRepository.findRequestById(
      duplicatedOfRequestId,
    );
    if (!original) {
      const err = new Error("Original request not found");
      err.statusCode = 404;
      throw err;
    }

    // Cannot mark itself as duplicate
    if (requestId === duplicatedOfRequestId) {
      const err = new Error("Cannot mark a request as duplicate of itself");
      err.statusCode = 400;
      throw err;
    }

    // Original must NOT be a duplicate itself (no chaining)
    if (original.isDuplicated) {
      const err = new Error(
        "Cannot link to a request that is itself a duplicate. Link to the original request instead.",
      );
      err.statusCode = 400;
      throw err;
    }

    // Sync status and priority from original
    const updated = await requestRepository.markAsDuplicate(
      requestId,
      duplicatedOfRequestId,
      {
        status: original.status,
        priority: original.priority,
      },
    );

    eventBus.emit("REQUEST_MARKED_DUPLICATE", {
      requestId,
      duplicatedOfRequestId,
    });

    return updated;
  }

  // ─── Priority ───────────────────────────────────────────

  /**
   * Coordinator updates priority of a request
   * Rules:
   * - Only when status is VERIFIED
   * - Cannot change priority of a duplicate request (change the original instead)
   */
  async updatePriority(requestId, priority) {
    const request = await this._getRequestOrThrow(requestId);

    // Only VERIFIED requests can have their priority changed
    if (request.status !== REQUEST_STATUS.VERIFIED) {
      const err = new Error(
        `Cannot change priority in ${request.status} status. Only VERIFIED requests can have their priority updated.`,
      );
      err.statusCode = 400;
      throw err;
    }

    // Duplicate requests cannot have their priority changed directly
    if (request.isDuplicated) {
      const err = new Error(
        "Cannot change priority of a duplicate request. Change the priority of the original request instead.",
      );
      err.statusCode = 400;
      throw err;
    }

    return await requestRepository.updatePriority(requestId, priority);
  }

  // ─── Location ───────────────────────────────────────────

  /**
   * Coordinator updates location and verification flag
   */
  async updateLocation(requestId, { location, isLocationVerified }) {
    await this._getRequestOrThrow(requestId);

    return await requestRepository.updateLocation(
      requestId,
      location,
      isLocationVerified ?? true,
    );
  }

  // ─── Helpers ────────────────────────────────────────────

  /**
   * Get request or throw 404
   * @private
   */
  async _getRequestOrThrow(requestId) {
    const request = await requestRepository.findRequestById(requestId);
    if (!request) {
      const err = new Error("Request not found");
      err.statusCode = 404;
      throw err;
    }
    return request;
  }
}

const requestService = new RequestService();

export { requestService };
