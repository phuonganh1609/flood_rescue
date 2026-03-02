import { warehouseRepository } from './warehouse.responsitory.js';
import {eventBus} from '../../utils/events.js';

class WarehouseService {
  // Warehouse service methods
    async create (warehouseData, managerID){
        const{ 
            name, 
            location,
            status = warehouseData.status || "EMPTY",
        } = warehouseData;
       
        const newWarehouse = await warehouseRepository.create({
            name,
            location,
            status: warehouseData.status || "EMPTY",
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

}
const warehouseService = new WarehouseService();
export { warehouseService };
