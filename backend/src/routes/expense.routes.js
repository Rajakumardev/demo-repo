import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  expenseCreateSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
  idParamSchema,
  summaryQuerySchema,
} from '../utils/schemas.js';

const router = Router();

router.use(requireAuth);

// Must be declared before `/:id` so it is not captured as an id.
router.get('/summary', validate(summaryQuerySchema, 'query'), expenseController.summary);

router.get('/', validate(expenseQuerySchema, 'query'), expenseController.list);
router.post('/', validate(expenseCreateSchema), expenseController.create);
router.get('/:id', validate(idParamSchema, 'params'), expenseController.get);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(expenseUpdateSchema),
  expenseController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), expenseController.remove);

export default router;
