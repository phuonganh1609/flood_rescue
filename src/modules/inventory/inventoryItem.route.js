import express from 'express';
import { create,
  getByID,
  getAll,
  update,
  remove,
} from './inventoryItem.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
const router = express.Router();

router.post('/', authenticate, authorize(['Manager']), create);
router.get('/list', authenticate, authorize(['Manager']), getAll);
router.get('/:id', authenticate, authorize(['Manager']), getByID);
router.put('/:id', authenticate, authorize(['Manager']), update);
router.delete('/:id', authenticate, authorize(['Manager']), remove);

export default router;
