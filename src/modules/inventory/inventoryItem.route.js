import express from 'express';
import multer from 'multer';
import { create,
  getByName,
  getById,
  getAll,
  update,
  remove,
  importFromExcel
} from './inventoryItem.controller.js';
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
const router = express.Router();
// multer config
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post('/', authenticate, authorize(['Manager']), create);
router.get('/list', authenticate, authorize(['Manager','Admin']), getAll);

// Import supplies from Excel
router.post(
  "/import",
  authenticate,
  authorize(["Manager"]),
  upload.single("file"),
  importFromExcel
);
router.get('/:supplyName', authenticate, authorize(['Manager']), getByName);
router.put('/:id', authenticate, authorize(['Manager']), update);
router.delete('/:id', authenticate, authorize(['Manager']), remove);

export default router;
