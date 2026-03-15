import { vehicleRepository } from "./vehicle.repository.js";
import { eventBus } from "../../utils/events.js";
import XLSX from "xlsx";

class VehicleService {

  async importExcel(vehicles, managerId) {
  
    const formattedVehicles = vehicles.map((row) => ({
      licensePlate: row.licensePlate,
      type: row.type,
      brand: row.brand,
      model: row.model,
      year: Number(row.year),
      color: row.color,
      capacity: Number(row.capacity),
      capacityUnit: row.capacityUnit,
      status: row.status || "ACTIVE",
      lastMaintenanceDate: row["Last Maintenance Date"] ? new Date(row["Last Maintenance Date"]) : null,
      maintenanceDate: row["Maintenance Date"] ? new Date(row["Maintenance Date"]) : null,
        createdBy: managerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    }));
  
    const result = await vehicleRepository.insertMany(formattedVehicles);
  
    return result;
  }

  async createVehicle(vehicleData, managerId) {
    const {
      licensePlate,
      type,
      brand,
      model,
      year,
      color,
      fuelType,
      capacity,
      capacityUnit,
      status = "ACTIVE",
      assignedTo,
      location,
      lastMaintenanceDate,
      maintenanceInterval,
      description,
      isActive = true,
    } = vehicleData;

    // Check if license plate already exists
    const existing = await vehicleRepository.licensePlateExists(licensePlate);
    if (existing) {
      const error = new Error("License plate already exists");
      error.statusCode = 400;
      throw error;
    }

    const newVehicle = await vehicleRepository.createVehicle({
      licensePlate,
      type,
      brand,
      model,
      year,
      color,
      fuelType,
      capacity,
      capacityUnit,
      status,
      assignedTo: assignedTo || null,
      location,
      lastMaintenanceDate,
      maintenanceInterval,
      description,
      isActive,
      createdBy: managerId,
    });

    eventBus.emit("VEHICLE_CREATED", {
      vehicleId: newVehicle._id,
      licensePlate: newVehicle.licensePlate,
      userId: managerId,
    });

    return {
      message: "Vehicle created successfully",
      data: newVehicle,
    };
  }

  // ─── Read ───────────────────────────────────────────────

  async getVehicle(licensePlate) {
    return await vehicleRepository.findVehicleByLicensePlate(licensePlate);
  }

  async getVehicleById(vehicleId) {
    return await vehicleRepository.findVehicleById(vehicleId);
  }

  async getAllVehicles(filter = {}, pagination = { page: 1, limit: 10 }) {
    return await vehicleRepository.findAllVehicles(filter, pagination);
  }

  async getVehiclesByType(type, pagination = { page: 1, limit: 10 }) {
    return await vehicleRepository.findVehiclesByType(type, pagination);
  }

  async getVehiclesByStatus(status, pagination = { page: 1, limit: 10 }) {
    return await vehicleRepository.findVehiclesByStatus(status, pagination);
  }

  async getVehiclesByTeam(teamId, pagination = { page: 1, limit: 10 }) {
    return await vehicleRepository.findVehiclesByTeam(teamId, pagination);
  }

  async getVehiclesNeedingMaintenance() {
    return await vehicleRepository.getVehiclesNeedingMaintenance();
  }

  async getVehicleStats() {
    const activeCount = await vehicleRepository.countByStatus("ACTIVE");
    const maintenanceCount = await vehicleRepository.countByStatus(
      "MAINTENANCE"
    );
    const outOfServiceCount = await vehicleRepository.countByStatus(
      "OUT_OF_SERVICE"
    );
    const inactiveCount = await vehicleRepository.countByStatus("INACTIVE");

    return {
      activeCount,
      maintenanceCount,
      outOfServiceCount,
      inactiveCount,
      total: activeCount + maintenanceCount + outOfServiceCount + inactiveCount,
    };
  }

  // ─── Update ─────────────────────────────────────────────

  async updateVehicle(vehicleId, updateData, managerId) {
    const vehicle = await vehicleRepository.findVehicleById(vehicleId);

    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    // Check if trying to update license plate to an existing one
    if (
      updateData.licensePlate &&
      updateData.licensePlate !== vehicle.licensePlate
    ) {
      const existing = await vehicleRepository.licensePlateExists(
        updateData.licensePlate
      );
      if (existing) {
        const error = new Error("License plate already exists");
        error.statusCode = 400;
        throw error;
      }
    }

    const updatedVehicle = await vehicleRepository.updateVehicle(vehicleId, {
      ...updateData,
      updatedAt: new Date(),
    });

    eventBus.emit("VEHICLE_UPDATED", {
      vehicleId: updatedVehicle._id,
      licensePlate: updatedVehicle.licensePlate,
      userId: managerId,
    });

    return {
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    };
  }

  // ─── Delete ─────────────────────────────────────────────

  async deleteVehicle(vehicleId, managerId) {
    const vehicle = await vehicleRepository.findVehicleById(vehicleId);

    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    const deletedVehicle = await vehicleRepository.deleteVehicle(vehicleId);

    eventBus.emit("VEHICLE_DELETED", {
      vehicleId: deletedVehicle._id,
      licensePlate: deletedVehicle.licensePlate,
      userId: managerId,
    });

    return {
      message: "Vehicle deleted successfully",
      data: deletedVehicle,
    };
  }

  // ─── Additional Operations ──────────────────────────────

  async assignVehicleToTeam(vehicleId, teamId, managerId) {
    const vehicle = await vehicleRepository.findVehicleById(vehicleId);

    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    const updatedVehicle = await vehicleRepository.updateVehicle(vehicleId, {
      assignedTo: teamId,
      updatedAt: new Date(),
    });

    eventBus.emit("VEHICLE_ASSIGNED", {
      vehicleId,
      teamId,
      licensePlate: vehicle.licensePlate,
      userId: managerId,
    });

    return {
      message: "Vehicle assigned successfully",
      data: updatedVehicle,
    };
  }

  async updateMaintenanceStatus(vehicleId, managerId) {
    const updatedVehicle = await vehicleRepository.updateVehicle(vehicleId, {
      lastMaintenanceDate: new Date(),
      status: "ACTIVE",
      updatedAt: new Date(),
    });

    eventBus.emit("VEHICLE_MAINTENANCE_UPDATED", {
      vehicleId,
      userId: managerId,
    });

    return {
      message: "Maintenance status updated successfully",
      data: updatedVehicle,
    };
  }
}

const vehicleService = new VehicleService();
export { vehicleService };
