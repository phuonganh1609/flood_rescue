import mongoose from "mongoose";
import { eventBus } from "../../utils/events.js";
import missionRepository from "../missions/mission.repository.js";
import { requestRepository } from "../requests/request.repository.js";
import { REQUEST_STATUS } from "../requests/request.model.js";
import { TEAM_STATUS } from "../teams/team.model.js";
import { teamRepository } from "../teams/team.repository.js";
import User from "../users/user.model.js";
import { TIMELINE_STATUS } from "./timeline.model.js";
import {
  timelineRepository,
  ACTIVE_TIMELINE_STATUSES,
  EXECUTING_TIMELINE_STATUSES,
  TERMINAL_TIMELINE_STATUSES,
} from "./timeline.repository.js";

const TIMELINE_TRANSITIONS = {
  [TIMELINE_STATUS.ASSIGNED]: [
    TIMELINE_STATUS.EN_ROUTE,
    TIMELINE_STATUS.WITHDRAWN,
    TIMELINE_STATUS.CANCELLED,
  ],
  [TIMELINE_STATUS.EN_ROUTE]: [TIMELINE_STATUS.ON_SITE],
  [TIMELINE_STATUS.ON_SITE]: [
    TIMELINE_STATUS.COMPLETED,
    TIMELINE_STATUS.PARTIAL,
    TIMELINE_STATUS.FAILED,
  ],
  [TIMELINE_STATUS.COMPLETED]: [],
  [TIMELINE_STATUS.PARTIAL]: [],
  [TIMELINE_STATUS.FAILED]: [],
  [TIMELINE_STATUS.WITHDRAWN]: [],
  [TIMELINE_STATUS.CANCELLED]: [],
};

function assertTimelineTransition(currentStatus, nextStatus) {
  const allowed = TIMELINE_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const err = new Error(
      `Invalid timeline transition: ${currentStatus} -> ${nextStatus}`,
    );
    err.statusCode = 400;
    throw err;
  }
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id?.toString?.() || value.toString();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

class TimelineService {
  async createTimeline(data) {
    const timeline = await timelineRepository.create(data);
    await this.syncRequestStatus(extractId(timeline.requestId));
    await this.syncTeamStatus(extractId(timeline.teamId));
    return await timelineRepository.findById(extractId(timeline._id));
  }

  async getTimelineById(timelineId) {
    const timeline = await timelineRepository.findById(timelineId);
    if (!timeline) {
      const err = new Error("Timeline not found");
      err.statusCode = 404;
      throw err;
    }
    return timeline;
  }

  async getTimelines(query = {}, user = null) {
    const { page = 1, limit = 10, missionId, requestId, teamId, status } = query;
    const filter = {};

    if (missionId) {
      if (!isObjectId(missionId)) {
        const err = new Error("missionId must be a valid ObjectId");
        err.statusCode = 400;
        throw err;
      }
      filter.missionId = missionId;
    }

    if (requestId) {
      if (!isObjectId(requestId)) {
        const err = new Error("requestId must be a valid ObjectId");
        err.statusCode = 400;
        throw err;
      }
      filter.requestId = requestId;
    }

    if (teamId) {
      if (!isObjectId(teamId)) {
        const err = new Error("teamId must be a valid ObjectId");
        err.statusCode = 400;
        throw err;
      }
      filter.teamId = teamId;
    }

    if (status) {
      filter.status = status;
    }

    // Rescue Team can only see their own timelines.
    if (user?.role === "Rescue Team") {
      const team = await this.getUserTeamId(user.id);
      if (!team) {
        return { data: [], total: 0, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: 0 };
      }
      filter.teamId = team;
    }

    return await timelineRepository.findAll(filter, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  async acceptTimeline(timelineId, actorUserId) {
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionCanExecute(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.EN_ROUTE);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ASSIGNED,
      {
        status: TIMELINE_STATUS.EN_ROUTE,
        startedAt: new Date(),
      },
    );

    if (!transitioned) {
      const err = new Error("Timeline has already been updated");
      err.statusCode = 409;
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    this.emitMissionAccepted(transitioned);
    this.emitMissionApproaching(transitioned);

    return transitioned;
  }

  async arriveTimeline(timelineId, actorUserId) {
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionCanExecute(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.ON_SITE);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.EN_ROUTE,
      {
        status: TIMELINE_STATUS.ON_SITE,
        arrivedAt: new Date(),
      },
    );

    if (!transitioned) {
      const err = new Error("Timeline has already been updated");
      err.statusCode = 409;
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    return transitioned;
  }

  async completeTimeline(timelineId, actorUserId, payload) {
    const { outcome, note, rescuedCount } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionCanExecute(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);

    const nextStatus =
      outcome === TIMELINE_STATUS.PARTIAL ?
        TIMELINE_STATUS.PARTIAL
      : TIMELINE_STATUS.COMPLETED;

    assertTimelineTransition(timeline.status, nextStatus);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ON_SITE,
      {
        status: nextStatus,
        completedAt: new Date(),
        note: note || timeline.note,
        rescuedCount: Number.isFinite(rescuedCount) ? rescuedCount : timeline.rescuedCount || 0,
      },
    );

    if (!transitioned) {
      const err = new Error("Timeline has already been updated");
      err.statusCode = 409;
      throw err;
    }

    const syncResult = await this.syncAllForTimeline(transitioned);

    if (nextStatus === TIMELINE_STATUS.COMPLETED || syncResult.requestStatus === REQUEST_STATUS.FULFILLED) {
      this.emitMissionCompleted(transitioned);
    }

    return transitioned;
  }

  async failTimeline(timelineId, actorUserId, payload) {
    const { failureReason, note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionCanExecute(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.FAILED);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ON_SITE,
      {
        status: TIMELINE_STATUS.FAILED,
        completedAt: new Date(),
        failureReason,
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error("Timeline has already been updated");
      err.statusCode = 409;
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    this.emitMissionFailed(transitioned, failureReason);
    return transitioned;
  }

  async withdrawTimeline(timelineId, actorUserId, payload) {
    const { withdrawalReason, note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionCanExecute(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.WITHDRAWN);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ASSIGNED,
      {
        status: TIMELINE_STATUS.WITHDRAWN,
        completedAt: new Date(),
        withdrawalReason,
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error("Timeline has already been updated");
      err.statusCode = 409;
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    return transitioned;
  }

  async cancelTimeline(timelineId, payload = {}) {
    const { note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.CANCELLED);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ASSIGNED,
      {
        status: TIMELINE_STATUS.CANCELLED,
        completedAt: new Date(),
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error("Timeline has already been updated");
      err.statusCode = 409;
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    return transitioned;
  }

  async cancelActiveTimelinesByMission(missionId, note = "Mission aborted") {
    const active = await timelineRepository.findActiveByMissionId(missionId);

    for (const item of active) {
      if (item.status === TIMELINE_STATUS.ASSIGNED) {
        await this.cancelTimeline(item._id.toString(), { note });
        continue;
      }

      const forced = await timelineRepository.updateById(item._id.toString(), {
        status: TIMELINE_STATUS.CANCELLED,
        completedAt: new Date(),
        note,
      });
      if (forced) {
        await this.syncAllForTimeline(forced);
      }
    }
  }

  async syncAllForTimeline(timeline) {
    const requestId = extractId(timeline.requestId);
    const missionId = extractId(timeline.missionId);
    const teamId = extractId(timeline.teamId);

    const [requestStatus] = await Promise.all([
      this.syncRequestStatus(requestId),
      this.syncMissionStatus(missionId),
      this.syncTeamStatus(teamId),
    ]);

    return { requestStatus };
  }

  async syncRequestStatus(requestId) {
    const request = await requestRepository.findRequestById(requestId);
    if (!request) return null;

    if (
      [REQUEST_STATUS.CLOSED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.REJECTED].includes(
        request.status,
      )
    ) {
      return request.status;
    }

    const timelines = await timelineRepository.findByRequestId(requestId);
    const active = timelines.filter((t) => ACTIVE_TIMELINE_STATUSES.includes(t.status));
    let desiredStatus = request.status;

    if (active.length > 0) {
      desiredStatus = REQUEST_STATUS.IN_PROGRESS;
    } else if (timelines.length > 0) {
      const totalRescued = timelines.reduce(
        (sum, t) => sum + (Number.isFinite(t.rescuedCount) ? t.rescuedCount : 0),
        0,
      );
      const hasCompleted = timelines.some((t) => t.status === TIMELINE_STATUS.COMPLETED);
      const hasExecution = timelines.some(
        (t) =>
          Boolean(t.startedAt) ||
          Boolean(t.arrivedAt) ||
          t.status === TIMELINE_STATUS.PARTIAL ||
          t.status === TIMELINE_STATUS.FAILED ||
          t.status === TIMELINE_STATUS.COMPLETED,
      );

      if (hasCompleted || totalRescued >= (request.peopleCount || Number.MAX_SAFE_INTEGER)) {
        desiredStatus = REQUEST_STATUS.FULFILLED;
      } else if (hasExecution) {
        desiredStatus = REQUEST_STATUS.PARTIALLY_FULFILLED;
      } else {
        desiredStatus = REQUEST_STATUS.VERIFIED;
      }
    }

    if (desiredStatus !== request.status) {
      await requestRepository.updateRequestStatus(requestId, desiredStatus);
    }

    return desiredStatus;
  }

  async syncMissionStatus(missionId) {
    const mission = await missionRepository.findById(missionId);
    if (!mission) return null;

    if (mission.status === "ABORTED" || mission.status === "PAUSED") {
      return mission.status;
    }

    const timelines = await timelineRepository.findByMissionId(missionId);
    if (timelines.length === 0) {
      if (mission.status !== "PLANNED") {
        await missionRepository.update(missionId, { status: "PLANNED" });
      }
      return "PLANNED";
    }

    const hasExecuting = timelines.some((t) =>
      EXECUTING_TIMELINE_STATUSES.includes(t.status),
    );
    if (hasExecuting) {
      if (mission.status !== "IN_PROGRESS") {
        await missionRepository.update(missionId, { status: "IN_PROGRESS" });
      }
      return "IN_PROGRESS";
    }

    const hasAssigned = timelines.some((t) => t.status === TIMELINE_STATUS.ASSIGNED);
    if (hasAssigned) {
      if (mission.status !== "PLANNED") {
        await missionRepository.update(missionId, { status: "PLANNED" });
      }
      return "PLANNED";
    }

    const requestIds = [
      ...new Set(timelines.map((t) => extractId(t.requestId)).filter(Boolean)),
    ];
    const relatedRequests = await Promise.all(
      requestIds.map((id) => requestRepository.findRequestById(id)),
    );

    const allFulfilled = relatedRequests
      .filter(Boolean)
      .every((r) => [REQUEST_STATUS.FULFILLED, REQUEST_STATUS.CLOSED].includes(r.status));

    const desiredStatus = allFulfilled ? "COMPLETED" : "PARTIAL";
    if (mission.status !== desiredStatus) {
      await missionRepository.update(missionId, { status: desiredStatus });
    }

    return desiredStatus;
  }

  async syncTeamStatus(teamId) {
    const activeCount = await timelineRepository.countActiveByTeamId(teamId);
    const status = activeCount > 0 ? TEAM_STATUS.BUSY : TEAM_STATUS.AVAILABLE;
    await teamRepository.updateStatus(teamId, status);
    return status;
  }

  async assertMissionCanExecute(missionId) {
    const mission = await missionRepository.findById(missionId);
    if (!mission) {
      const err = new Error("Mission not found");
      err.statusCode = 404;
      throw err;
    }

    if (["ABORTED", "COMPLETED", "PAUSED"].includes(mission.status)) {
      const err = new Error(`Mission is ${mission.status}. Timeline action is not allowed.`);
      err.statusCode = 400;
      throw err;
    }
  }

  async getUserTeamId(userId) {
    const user = await User.findById(userId).select("teamId").lean();
    return user?.teamId?.toString?.() || null;
  }

  async assertTeamActionAllowed(timeline, actorUserId) {
    const actorTeamId = await this.getUserTeamId(actorUserId);
    if (!actorTeamId) {
      const err = new Error("Current user is not assigned to any team");
      err.statusCode = 403;
      throw err;
    }

    const timelineTeamId = extractId(timeline.teamId);
    if (actorTeamId !== timelineTeamId) {
      const err = new Error("You are not allowed to operate this timeline");
      err.statusCode = 403;
      throw err;
    }
  }

  emitMissionAccepted(timeline) {
    eventBus.emit("MISSION_ACCEPTED", {
      requestId: extractId(timeline.requestId),
      missionId: extractId(timeline.missionId),
      teamName: timeline.teamId?.name || "Rescue Team",
    });
  }

  emitMissionApproaching(timeline) {
    const citizenId = extractId(timeline.requestId?.userId);
    if (!citizenId) return;

    eventBus.emit("MISSION_APPROACHING", {
      requestId: extractId(timeline.requestId),
      citizenId,
      teamName: timeline.teamId?.name || "Rescue Team",
    });
  }

  emitMissionCompleted(timeline) {
    const citizenId = extractId(timeline.requestId?.userId);
    if (!citizenId) return;

    eventBus.emit("MISSION_COMPLETED", {
      requestId: extractId(timeline.requestId),
      missionId: extractId(timeline.missionId),
      citizenId,
    });
  }

  emitMissionFailed(timeline, reason) {
    const citizenId = extractId(timeline.requestId?.userId);
    if (!citizenId) return;

    eventBus.emit("MISSION_FAILED", {
      requestId: extractId(timeline.requestId),
      missionId: extractId(timeline.missionId),
      citizenId,
      reason,
    });
  }
}

export default new TimelineService();
export { assertTimelineTransition, TIMELINE_TRANSITIONS, TERMINAL_TIMELINE_STATUSES };
