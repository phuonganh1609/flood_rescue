import { teamStatsService } from "./team.stats.service.js";
import mongoose from "mongoose";

/**
 * Controller for Team Statistics operations
 */

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Get team statistics
 * @route GET /teams/:teamId/stats
 * @access Rescue Team, Rescue Coordinator, Admin
 */
export const getTeamStats = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!teamId || !isValidId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Team ID is invalid"
      });
    }

    const stats = await teamStatsService.getTeamStatistics(teamId);

    res.status(200).json({
      success: true,
      message: "Team statistics retrieved successfully",
      data: stats
    });
  } catch (error) {
    console.error("Error getting team stats:", error);
    
    if (error.message.includes("Team not found")) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve team statistics",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

/**
 * Get rescue trends over time
 * @route GET /teams/:teamId/trends
 * @access Rescue Team, Rescue Coordinator, Admin
 */
export const getRescueTrends = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { period = "week" } = req.query;

    if (!teamId || !isValidId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Team ID is invalid"
      });
    }

    if (!["week", "month", "year"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Use 'week', 'month', or 'year'"
      });
    }

    const trends = await teamStatsService.getRescueTrends(teamId, period);

    res.status(200).json({
      success: true,
      message: "Rescue trends retrieved successfully",
      data: trends
    });
  } catch (error) {
    console.error("Error getting rescue trends:", error);
    
    if (error.message.includes("Team not found")) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve rescue trends",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

/**
 * Get comprehensive team report (stats + trends)
 * @route GET /teams/:teamId/report
 * @access Rescue Team, Rescue Coordinator, Admin
 */
export const getTeamReport = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { period = "week" } = req.query;

    if (!teamId || !isValidId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Team ID is invalid"
      });
    }

    // Get both stats and trends in parallel
    const [stats, trends] = await Promise.all([
      teamStatsService.getTeamStatistics(teamId),
      teamStatsService.getRescueTrends(teamId, period)
    ]);

    res.status(200).json({
      success: true,
      message: "Team report retrieved successfully",
      data: {
        stats,
        trends
      }
    });
  } catch (error) {
    console.error("Error getting team report:", error);
    
    if (error.message.includes("Team not found")) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve team report",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};
