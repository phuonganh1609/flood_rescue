import TimelineVehicle from "./timelineVehicle.model.js";
import Vehicle from "../vehicles/vehicle.model.js"; // Giả sử đường dẫn model Vehicle của bạn

class TimelineVehicleRepository {
  async findByTimeline(timelineId) {
    return await TimelineVehicle.find({ timelineId }).populate("vehicleId");
  }

  async findActiveClaim(timelineId, vehicleId) {
    return await TimelineVehicle.findOne({
      timelineId,
      vehicleId,
      returnedAt: { $exists: false },
    });
  }

  async create(data) {
    return await TimelineVehicle.create(data);
  }

  async updateReturn(id) {
    return await TimelineVehicle.findByIdAndUpdate(
      id,
      { returnedAt: new Date() },
      { new: true }
    );
  }

  // Kiểm tra xem xe có đang bị team khác mượn không
  async isVehicleBusy(vehicleId) {
    const active = await TimelineVehicle.findOne({
      vehicleId,
      returnedAt: { $exists: false }
    });
    return !!active;
  }
}

export const timelineVehicleRepository = new TimelineVehicleRepository();