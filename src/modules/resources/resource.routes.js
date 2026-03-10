import express from 'express';
import * as controller from './resource.controller.js';

const router = express.Router();

// Resources CRUD
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.get('/', controller.getAll);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete_);

// Special operations
router.post('/:id/allocate', controller.allocate);
router.post('/:id/deallocate', controller.deallocate);

export default router;
