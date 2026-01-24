import RequestMission from "./request.model.js";

/**
 * Repository for Request operations
 */
class RequestRepository {
  /**
   * Create a new request
   * @param {Object} requestData
   * @returns {Promise<Object>}
   */
  async createRequest(requestData) {
    const request = new RequestMission(requestData);
    return await request.save();
  }

  /**
   * Find request by ID
   * @param {string} requestId
   * @returns {Promise<Object|null>}
   */
  async findRequestById(requestId) {
    return await RequestMission.findById(requestId).populate(
      "userId",
      "displayName userName email phoneNumber"
    );
  }

  /**
   * Find all requests with pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} pagination - Pagination info
   * @returns {Promise<Object>}
   */
  async findAllRequests(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const requests = await RequestMission.find(filter)
      .populate("userId", "displayName userName email phoneNumber")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await RequestMission.countDocuments(filter);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update request
   * @param {string} requestId
   * @param {Object} updateData
   * @returns {Promise<Object|null>}
   */
  async updateRequest(requestId, updateData) {
    return await RequestMission.findByIdAndUpdate(requestId, updateData, {
      new: true,
    }).populate("userId", "displayName userName email phoneNumber");
  }

  /**
   * Delete request
   * @param {string} requestId
   * @returns {Promise<Object|null>}
   */
  async deleteRequest(requestId) {
    return await RequestMission.findByIdAndDelete(requestId);
  }

  /**
   * Update request status
   * @param {string} requestId
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  async updateRequestStatus(requestId, status) {
    return await RequestMission.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    ).populate("userId", "displayName userName email phoneNumber");
  }
}

const requestRepository = new RequestRepository();

export { requestRepository };
