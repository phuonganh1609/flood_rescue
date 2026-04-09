import { timelineVehicleRepository } from "./timelineVehicle.repository.js";
import Vehicle from "../vehicles/vehicle.model.js";

class TimelineVehicleService {
  async claimVehicle(timelineId, vehicleId) {
    // 1. Kiểm tra xe có tồn tại và sẵn sàng không
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.status !== "ACTIVE") {
      throw new Error("Xe không khả dụng hoặc đang làm nhiệm vụ khác");
    }

    // 2. Kiểm tra xe có đang bị team nào "ngâm" mà chưa trả không
    const isBusy = await timelineVehicleRepository.isVehicleBusy(vehicleId);
    if (isBusy) {
      throw new Error("Xe này hiện đang được một đội khác sử dụng");
    }

    // 3. Tạo record claim
    const record = await timelineVehicleRepository.create({ timelineId, vehicleId });

    // 4. Cập nhật trạng thái xe trực tiếp
    await Vehicle.findByIdAndUpdate(vehicleId, { status: "BUSY" });

    return record;
  }

  async returnVehicle(timelineId, vehicleId) {
    const record = await timelineVehicleRepository.findActiveClaim(timelineId, vehicleId);
    if (!record) {
      throw new Error("Không tìm thấy bản ghi nhận xe đang hoạt động");
    }

    const updatedRecord = await timelineVehicleRepository.updateReturn(record._id);

    // Trả xe xong thì xe quay về trạng thái ACTIVE
    await Vehicle.findByIdAndUpdate(vehicleId, { status: "ACTIVE" });

    return updatedRecord;
  }

  async getTimelineVehicles(timelineId) {
    return await timelineVehicleRepository.findByTimeline(timelineId);
  }
}

export const timelineVehicleService = new TimelineVehicleService();