import * as categoryModel from '../models/category.model.js';
import { conflict, notFound } from '../utils/errors.js';

export async function list(req, res, next) {
  try {
    const categories = await categoryModel.listByUser(req.user.id);
    return res.json({ categories });
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    const category = await categoryModel.create(req.user.id, req.body);
    return res.status(201).json({ category });
  } catch (err) {
    if (err.code === '23505') {
      return next(conflict('A category with that name already exists'));
    }
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const category = await categoryModel.update(req.user.id, req.params.id, req.body);
    if (!category) throw notFound('Category not found');
    return res.json({ category });
  } catch (err) {
    if (err.code === '23505') {
      return next(conflict('A category with that name already exists'));
    }
    return next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const removed = await categoryModel.remove(req.user.id, req.params.id);
    if (!removed) throw notFound('Category not found');
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
