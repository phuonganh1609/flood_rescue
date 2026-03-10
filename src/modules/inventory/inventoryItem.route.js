import express from 'express';
import { create,
  getByName,
  getAll,
  update,
  remove,
} from './inventoryItem.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
const router = express.Router();

router.post('/', authenticate, authorize(['Manager']), create);
router.get('/list', authenticate, authorize(['Manager']), getAll);

router.get('/:supplyName', authenticate, authorize(['Manager']), getByName);
router.put('/:id', authenticate, authorize(['Manager']), update);
router.delete('/:id', authenticate, authorize(['Manager']), remove);

export default router;
