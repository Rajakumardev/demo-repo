import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  idParamSchema,
} from '../utils/schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', categoryController.list);
router.post('/', validate(categoryCreateSchema), categoryController.create);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(categoryUpdateSchema),
  categoryController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), categoryController.remove);

export default router;
