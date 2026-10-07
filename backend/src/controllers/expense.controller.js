import * as categoryModel from '../models/category.model.js';
import * as expenseModel from '../models/expense.model.js';
import { badRequest, notFound } from '../utils/errors.js';

/** Ensure a referenced category exists and belongs to the current user. */
async function assertCategoryBelongsToUser(userId, categoryId) {
  if (categoryId === undefined || categoryId === null) return;
  const category = await categoryModel.findById(userId, categoryId);
  if (!category) throw badRequest('The selected category does not exist');
}

export async function list(req, res, next) {
  try {
    const [expenses, meta] = await Promise.all([
      expenseModel.listByUser(req.user.id, req.query),
      expenseModel.countByUser(req.user.id, req.query),
    ]);

    return res.json({
      expenses,
      meta: {
        total: meta.total,
        amount: meta.amount,
        limit: req.query.limit,
        offset: req.query.offset,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function summary(req, res, next) {
  try {
    const data = await expenseModel.summary(req.user.id, req.query);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

export async function get(req, res, next) {
  try {
    const expense = await expenseModel.findById(req.user.id, req.params.id);
    if (!expense) throw notFound('Expense not found');
    return res.json({ expense });
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    await assertCategoryBelongsToUser(req.user.id, req.body.categoryId);
    const expense = await expenseModel.create(req.user.id, req.body);
    return res.status(201).json({ expense });
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    await assertCategoryBelongsToUser(req.user.id, req.body.categoryId);
    const expense = await expenseModel.update(req.user.id, req.params.id, req.body);
    if (!expense) throw notFound('Expense not found');
    return res.json({ expense });
  } catch (err) {
    return next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const removed = await expenseModel.remove(req.user.id, req.params.id);
    if (!removed) throw notFound('Expense not found');
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
