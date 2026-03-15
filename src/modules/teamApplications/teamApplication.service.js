import User from "../users/user.model.js";
import { userRepository } from "../users/user.repository.js";
import { eventBus } from "../../utils/events.js";
import {
  teamApplicationRepository,
} from "./teamApplication.repository.js";
import { TEAM_APPLICATION_STATUS } from "./teamApplication.model.js";

const REVIEWER_ROLES = ["Rescue Coordinator", "Admin"];

class TeamApplicationService {
  async submitApplication(userId, { motivation, confirmPhoneNumber }) {
    const user = await User.findById(userId).select(
      "displayName userName email phoneNumber role isActive",
    );

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("Inactive users cannot submit rescue team applications");
    }

    if (user.role !== "Citizen") {
      throw new Error("Only Citizen users can submit rescue team applications");
    }

    const pendingApplication = await teamApplicationRepository.findPendingByUserId(userId);
    if (pendingApplication) {
      throw new Error("You already have a pending rescue team application");
    }

    const submittedPhoneNumber = confirmPhoneNumber || user.phoneNumber;
    if (!submittedPhoneNumber) {
      throw new Error("A phone number is required to submit the application");
    }

    const application = await teamApplicationRepository.create({
      userId,
      motivation,
      submittedPhoneNumber,
      status: TEAM_APPLICATION_STATUS.PENDING,
    });

    const createdApplication = await teamApplicationRepository.findById(application._id);

    eventBus.emit("TEAM_APPLICATION_SUBMITTED", {
      applicationId: createdApplication._id.toString(),
      citizenId: userId,
      citizenName: user.displayName || user.userName,
      submittedPhoneNumber,
    });

    return createdApplication;
  }

  async listOwnApplications(userId, query = {}) {
    const { page = 1, limit = 10, status } = query;
    const filter = {};
    if (status) filter.status = status;

    return await teamApplicationRepository.findByUserId(
      userId,
      filter,
      { page, limit },
      { createdAt: -1 },
    );
  }

  async listAllApplications(query = {}) {
    const { page = 1, limit = 10, status } = query;
    const filter = {};
    if (status) filter.status = status;

    return await teamApplicationRepository.findAll(
      filter,
      { page, limit },
      { createdAt: -1 },
    );
  }

  async getApplicationById(applicationId, requester) {
    const application = await this._getApplicationOrThrow(applicationId);

    const ownerId = application.userId?._id?.toString?.() || application.userId?.toString?.();
    const canReview = REVIEWER_ROLES.includes(requester.role);

    if (!canReview && ownerId !== requester.id) {
      throw new Error("You are not allowed to access this application");
    }

    return application;
  }

  async withdrawApplication(applicationId, requester) {
    const application = await this._getApplicationOrThrow(applicationId);
    const ownerId = application.userId?._id?.toString?.() || application.userId?.toString?.();

    if (ownerId !== requester.id) {
      throw new Error("You can only withdraw your own application");
    }

    this._assertPending(application);

    const updated = await teamApplicationRepository.updateById(applicationId, {
      status: TEAM_APPLICATION_STATUS.WITHDRAWN,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    });

    eventBus.emit("TEAM_APPLICATION_WITHDRAWN", {
      applicationId,
      citizenId: ownerId,
      citizenName:
        application.userId?.displayName || application.userId?.userName || "Citizen",
    });

    return updated;
  }

  async approveApplication(applicationId, reviewer) {
    this._assertReviewer(reviewer.role);
    const application = await this._getApplicationOrThrow(applicationId);
    this._assertPending(application);

    const userId = application.userId?._id?.toString?.() || application.userId?.toString?.();
    const user = await User.findById(userId).select("displayName userName role isActive");

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("Cannot approve application for an inactive user");
    }

    if (user.role !== "Citizen") {
      throw new Error("Only Citizen applications can be approved");
    }

    await userRepository.updateRole(userId, "Rescue Team");

    const updated = await teamApplicationRepository.updateById(applicationId, {
      status: TEAM_APPLICATION_STATUS.APPROVED,
      reviewedBy: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    });

    eventBus.emit("TEAM_APPLICATION_APPROVED", {
      applicationId,
      citizenId: userId,
      reviewerName: reviewer.displayName,
    });

    return updated;
  }

  async rejectApplication(applicationId, reviewer, { reason }) {
    this._assertReviewer(reviewer.role);
    const application = await this._getApplicationOrThrow(applicationId);
    this._assertPending(application);

    const userId = application.userId?._id?.toString?.() || application.userId?.toString?.();

    const updated = await teamApplicationRepository.updateById(applicationId, {
      status: TEAM_APPLICATION_STATUS.REJECTED,
      reviewedBy: reviewer.id,
      reviewedAt: new Date(),
      rejectionReason: reason || null,
    });

    eventBus.emit("TEAM_APPLICATION_REJECTED", {
      applicationId,
      citizenId: userId,
      reason,
      reviewerName: reviewer.displayName,
    });

    return updated;
  }

  async _getApplicationOrThrow(applicationId) {
    const application = await teamApplicationRepository.findById(applicationId);
    if (!application) {
      throw new Error("Application not found");
    }
    return application;
  }

  _assertPending(application) {
    if (application.status !== TEAM_APPLICATION_STATUS.PENDING) {
      throw new Error("Only pending applications can be modified");
    }
  }

  _assertReviewer(role) {
    if (!REVIEWER_ROLES.includes(role)) {
      throw new Error("Only Rescue Coordinator or Admin can review applications");
    }
  }
}

const teamApplicationService = new TeamApplicationService();

export { teamApplicationService };
