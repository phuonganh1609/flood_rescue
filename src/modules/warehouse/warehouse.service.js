import { warehouseRepository } from './warehouse.repository.js';
import { eventBus } from '../../utils/events.js';

class WarehouseService {
  // Warehouse service methods
  /**
   * Validate & normalize location before saving
   * Expected format: { type: 'Point', coordinates: [longitude, latitude] }
   */
  _validateLocation(location) {
    if (!location || !location.coordinates || !Array.isArray(location.coordinates)) {
      throw new Error('Location must have coordinates array');
    }
    const [lon, lat] = location.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      throw new Error('Coordinates must be numbers');
    }
    if (lon < -180 || lon > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    if (lat < -90 || lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    return { type: 'Point', coordinates: [lon, lat] };
  }

    async create (warehouseData, managerID){
        const { name, location, status } = warehouseData;
        const normalizedLocation = this._validateLocation(location);
       
        const newWarehouse = await warehouseRepository.create({
            name,
            location: normalizedLocation,
            status: status || "EMPTY",
            createdBy: managerID,
        });
        eventBus.emit("WAREHOUSE_CREATED", {
            warehouseId: newWarehouse._id,
            userId: managerID,
        });

        return {
            message: "Warehouse created successfully",
            data: newWarehouse,
        };
    };

    async getByName(warehouseName) {
        return await warehouseRepository.findByName(warehouseName);
    };

    async list(filter = {}, pagination = { page: 1, limit: 10 }) {
        return await warehouseRepository.findAll(filter, pagination);
    };

    async update(name, payload) {
        if (payload.location) {
            payload.location = this._validateLocation(payload.location);
        }
        const updatedWarehouse = await warehouseRepository.updateByName(name, payload);
        if (updatedWarehouse) {
            eventBus.emit("WAREHOUSE_UPDATED", {
                warehouseName: updatedWarehouse.name,
                updatedFields: payload,
            });
        } else {
            throw new Error("Warehouse not found");
        }
        return updatedWarehouse;
    };

    async remove(name) {
        const deletedWarehouse = await warehouseRepository.deleteByName(name);
        if (deletedWarehouse) {
            eventBus.emit("WAREHOUSE_DELETED", {
                warehouseId: deletedWarehouse._id,
            });
        }
        return deletedWarehouse;
    };

     async updateWarehouseStatus(warehouseId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const warehouse = await warehouseRepository.findById(warehouseId, session);

      if (!warehouse) throw new Error("Warehouse not found");

      // nếu đang maintenance thì giữ nguyên
      if (warehouse.status === "MAINTENANCE") {
        await session.commitTransaction();
        session.endSession();
        return warehouse;
      }

      const itemCount = await warehouseRepository.countInventoryItems(
        warehouseId,
        session
      );

      let newStatus = "EMPTY";

      if (itemCount > 0) {
        newStatus = "FULL";
      }

      const updated = await warehouseRepository.updateStatus(
        warehouseId,
        newStatus,
        session
      );

      await session.commitTransaction();
      session.endSession();

      return updated;

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  //  MANUAL set maintenance
  async setMaintenance(warehouseId) {
    return await warehouseRepository.updateStatus(
      warehouseId,
      "MAINTENANCE"
    );
  }

  //  remove maintenance → auto recalc lại
  async removeMaintenance(warehouseId) {
    return await this.updateWarehouseStatus(warehouseId);
  }

}
const warehouseService = new WarehouseService();
export { warehouseService };
