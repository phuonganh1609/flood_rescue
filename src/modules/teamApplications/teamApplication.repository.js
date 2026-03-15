import TeamApplication from "./teamApplication.model.js";

const APPLICATION_POPULATE = [
  { path: "userId", select: "displayName userName email phoneNumber role isActive teamId" },
  { path: "reviewedBy", select: "displayName userName email role" },
];

class TeamApplicationRepository {
  async create(applicationData) {
    const application = new TeamApplication(applicationData);
    return await application.save();
  }

  async findPendingByUserId(userId) {
    return await TeamApplication.findOne({ userId, status: "PENDING" });
  }

  async findById(applicationId) {
    return await TeamApplication.findById(applicationId).populate(APPLICATION_POPULATE);
  }

  async findByUserId(
    userId,
    filter = {},
    pagination = { page: 1, limit: 10 },
    sort = { createdAt: -1 },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const query = { ...filter, userId };

    const [applications, total] = await Promise.all([
      TeamApplication.find(query)
        .populate(APPLICATION_POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      TeamApplication.countDocuments(query),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findAll(
    filter = {},
    pagination = { page: 1, limit: 10 },
    sort = { createdAt: -1 },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      TeamApplication.find(filter)
        .populate(APPLICATION_POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      TeamApplication.countDocuments(filter),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateById(applicationId, updateData) {
    return await TeamApplication.findByIdAndUpdate(applicationId, updateData, {
      new: true,
    }).populate(APPLICATION_POPULATE);
  }
}

const teamApplicationRepository = new TeamApplicationRepository();

export { teamApplicationRepository };
