import mongoose from "mongoose";
import Vehicle from "./vehicle.model.js";
import XLSX from "xlsx";

class VehicleRepository {

async insertMany(vehicles) {
    return await Vehicle.insertMany(vehicles);
  }
  

  /**
   * Create a new vehicle
   */
  async createVehicle(vehicleData) {
    const vehicle = new Vehicle(vehicleData);
    return await vehicle.save();
  }

  /**
   * Find vehicle by license plate
   */
  async findVehicleByLicensePlate(licensePlate) {
    return await Vehicle.findOne({ licensePlate: licensePlate.toUpperCase() });
  }

  /**
   * Find vehicle by ID with populated references
   */
  async findVehicleById(vehicleId) {
    return await Vehicle.findById(vehicleId)
      .populate("assignedTo", "name")
      .populate("createdBy", "name email");
  }

  /**
   * Find all vehicles with pagination
   */
  async findAllVehicles(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find(filter)
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const total = await Vehicle.countDocuments(filter);

    return {
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find vehicles by type
   */
  async findVehiclesByType(type, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find({ type, isActive: true })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const total = await Vehicle.countDocuments({ type, isActive: true });

    return {
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find vehicles by status
   */
  async findVehiclesByStatus(status, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find({ status })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const total = await Vehicle.countDocuments({ status });

    return {
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find vehicles assigned to a team
   */
  async findVehiclesByTeam(teamId, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const vehicles = await Vehicle.find({
      assignedTo: new mongoose.Types.ObjectId(teamId),
      isActive: true,
    })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const total = await Vehicle.countDocuments({
      assignedTo: new mongoose.Types.ObjectId(teamId),
      isActive: true,
    });

    return {
      data: vehicles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update vehicle by ID
   */
  async updateVehicle(vehicleId, updateData) {
    return await Vehicle.findByIdAndUpdate(vehicleId, updateData, {
      new: true,
    }).populate("assignedTo", "name");
  }

  /**
   * Delete vehicle by ID
   */
  async deleteVehicle(vehicleId) {
    return await Vehicle.findByIdAndDelete(vehicleId);
  }

  /**
   * Check if license plate exists
   */
  async licensePlateExists(licensePlate) {
    return await Vehicle.findOne({
      licensePlate: licensePlate.toUpperCase(),
    });
  }

  /**
   * Count vehicles by status
   */
  async countByStatus(status) {
    return await Vehicle.countDocuments({ status, isActive: true });
  }

  /**
   * Get vehicles needing maintenance
   */
  async getVehiclesNeedingMaintenance() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await Vehicle.find({
      lastMaintenanceDate: { $lt: thirtyDaysAgo },
      isActive: true,
    }).populate("assignedTo", "name");
  }
}

const vehicleRepository = new VehicleRepository();
export { vehicleRepository };
