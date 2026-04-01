import Timeline from "../timelines/timeline.model.js";
import MissionRequest from "../missionRequests/missionRequest.model.js";
import { teamRepository } from "./team.repository.js";
import { TIMELINE_STATUS } from "../timelines/timeline.model.js";
import mongoose from "mongoose";

/**
 * Service for Team Statistics operations
 */
class TeamStatsService {
  /**
   * Get comprehensive team statistics
   * @param {string} teamId - Team ID
   * @returns {Object} Team statistics
   */
  async getTeamStatistics(teamId) {
    try {
      // Get team basic info with member stats
      const team = await teamRepository.findByIdWithStats(teamId);
      if (!team) {
        throw new Error("Team not found");
      }

      // Get timeline statistics
      const timelineStats = await this.getTimelineStats(teamId);
      
      // Get people rescued statistics
      const peopleRescuedStats = await this.getPeopleRescuedStats(teamId);

      // Calculate success rate
      const successRate = timelineStats.totalMissions > 0 
        ? Math.round((timelineStats.missionsCompleted / timelineStats.totalMissions) * 100)
        : 0;

      return {
        teamId: team._id,
        teamName: team.name,
        teamLeader: team.leaderId ? {
          id: team.leaderId._id,
          displayName: team.leaderId.displayName,
          userName: team.leaderId.userName
        } : null,
        memberCount: team.memberStats?.total || 0,
        activeMemberCount: team.memberStats?.active || 0,
        ...timelineStats,
        ...peopleRescuedStats,
        successRate,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get team statistics: ${error.message}`);
    }
  }

  /**
   * Get timeline statistics for a team
   * @param {string} teamId - Team ID
   * @returns {Object} Timeline statistics
   */
  async getTimelineStats(teamId) {
    const teamObjectId = new mongoose.Types.ObjectId(teamId);

    const stats = await Timeline.aggregate([
      { $match: { teamId: teamObjectId } },
      {
        $group: {
          _id: null,
          totalMissions: { $sum: 1 },
          missionsCompleted: {
            $sum: { $cond: [{ $eq: ["$status", TIMELINE_STATUS.COMPLETED] }, 1, 0] }
          },
          missionsInProgress: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      TIMELINE_STATUS.EN_ROUTE,
                      TIMELINE_STATUS.ON_SITE,
                      TIMELINE_STATUS.CLAIMING_SUPPLIES
                    ]
                  ]
                },
                1,
                0
              ]
            }
          },
          missionsFailed: {
            $sum: { $cond: [{ $eq: ["$status", TIMELINE_STATUS.FAILED] }, 1, 0] }
          }
        }
      }
    ]);

    return {
      totalMissions: stats[0]?.totalMissions || 0,
      missionsCompleted: stats[0]?.missionsCompleted || 0,
      missionsInProgress: stats[0]?.missionsInProgress || 0,
      missionsFailed: stats[0]?.missionsFailed || 0
    };
  }

  /**
   * Get people rescued statistics for a team
   * @param {string} teamId - Team ID
   * @returns {Object} People rescued statistics
   */
  async getPeopleRescuedStats(teamId) {
    const teamObjectId = new mongoose.Types.ObjectId(teamId);

    // Get completed timelines for this team
    const completedTimelines = await Timeline.find({
      teamId: teamObjectId,
      status: TIMELINE_STATUS.COMPLETED
    }).select('missionId');

    const missionIds = completedTimelines.map(timeline => timeline.missionId);

    if (missionIds.length === 0) {
      return { peopleRescued: 0 };
    }

    // Aggregate people rescued from mission requests of completed missions
    const peopleStats = await MissionRequest.aggregate([
      { $match: { missionId: { $in: missionIds } } },
      {
        $group: {
          _id: null,
          totalRescued: { $sum: "$peopleRescued" }
        }
      }
    ]);

    return {
      peopleRescued: peopleStats[0]?.totalRescued || 0
    };
  }

  /**
   * Get rescue trends over time
   * @param {string} teamId - Team ID
   * @param {string} period - Period: 'week', 'month', 'year'
   * @returns {Object} Rescue trends data
   */
  async getRescueTrends(teamId, period = 'week') {
    try {
      const teamObjectId = new mongoose.Types.ObjectId(teamId);
      const now = new Date();
      let startDate, format, labels;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          format = { $dateToString: { format: "%a", date: "$completedAt" } };
          labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          format = { $dateToString: { format: "Tuần %U", date: "$completedAt" } };
          labels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          format = { $dateToString: { format: "T%m", date: "$completedAt" } };
          labels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
          break;
        default:
          throw new Error("Invalid period. Use 'week', 'month', or 'year'");
      }

      // Get completed timelines with mission data
      const completedTimelines = await Timeline.find({
        teamId: teamObjectId,
        status: TIMELINE_STATUS.COMPLETED,
        completedAt: { $gte: startDate }
      }).select('missionId completedAt');

      const missionIds = completedTimelines.map(t => t.missionId);

      if (missionIds.length === 0) {
        return {
          period,
          labels: labels.slice(0, period === 'week' ? 7 : period === 'month' ? 4 : 12),
          datasets: [{
            label: "Người được cứu",
            data: new Array(period === 'week' ? 7 : period === 'month' ? 4 : 12).fill(0),
            total: 0
          }]
        };
      }

      // Get mission requests with people rescued data
      const missionRequests = await MissionRequest.find({
        missionId: { $in: missionIds }
      }).select('missionId peopleRescued');

      // Map missionId to total people rescued
      const missionRescueMap = {};
      missionRequests.forEach(mr => {
        const missionId = mr.missionId.toString();
        if (!missionRescueMap[missionId]) {
          missionRescueMap[missionId] = 0;
        }
        missionRescueMap[missionId] += mr.peopleRescued || 0;
      });

      // Group by time period
      const trends = {};
      completedTimelines.forEach(timeline => {
        const rescued = missionRescueMap[timeline.missionId.toString()] || 0;
        const dateKey = this.getDateKey(timeline.completedAt, period);
        
        if (!trends[dateKey]) {
          trends[dateKey] = 0;
        }
        trends[dateKey] += rescued;
      });

      // Generate data array matching labels
      const data = this.generateDataArray(trends, period, labels);

      return {
        period,
        labels: labels.slice(0, data.length),
        datasets: [{
          label: "Người được cứu",
          data,
          total: data.reduce((sum, val) => sum + val, 0)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get rescue trends: ${error.message}`);
    }
  }

  /**
   * Helper method to get date key based on period
   * @param {Date} date - Date
   * @param {string} period - Period
   * @returns {string} Date key
   */
  getDateKey(date, period) {
    const d = new Date(date);
    switch (period) {
      case 'week':
        return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
      case 'month':
        return `Tuần ${Math.ceil(d.getDate() / 7)}`;
      case 'year':
        return `T${d.getMonth() + 1}`;
      default:
        return d.toISOString();
    }
  }

  /**
   * Helper method to generate data array from trends
   * @param {Object} trends - Trends data
   * @param {string} period - Period
   * @param {Array} labels - Labels array
   * @returns {Array} Data array
   */
  generateDataArray(trends, period, labels) {
    const dataLength = period === 'week' ? 7 : period === 'month' ? 4 : 12;
    const data = new Array(dataLength).fill(0);

    if (period === 'week') {
      const dayMap = { 'T2': 0, 'T3': 1, 'T4': 2, 'T5': 3, 'T6': 4, 'T7': 5, 'CN': 6 };
      Object.keys(trends).forEach(key => {
        if (dayMap[key] !== undefined) {
          data[dayMap[key]] = trends[key];
        }
      });
    } else if (period === 'month') {
      Object.keys(trends).forEach(key => {
        const weekNum = parseInt(key.replace('Tuần ', '')) - 1;
        if (weekNum >= 0 && weekNum < 4) {
          data[weekNum] = trends[key];
        }
      });
    } else {
      Object.keys(trends).forEach(key => {
        const monthNum = parseInt(key.replace('T', '')) - 1;
        if (monthNum >= 0 && monthNum < 12) {
          data[monthNum] = trends[key];
        }
      });
    }

    return data;
  }
}

export const teamStatsService = new TeamStatsService();
