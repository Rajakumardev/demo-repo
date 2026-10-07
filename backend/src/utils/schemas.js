import { z } from 'zod';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  currency: z.string().trim().length(3).toUpperCase().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid identifier'),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format');

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryFields = {
  name: z.string().trim().min(1, 'Name is required').max(80),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a hex value like #6366f1'),
  icon: z.string().trim().min(1).max(40),
};

export const categoryCreateSchema = z.object({
  name: categoryFields.name,
  color: categoryFields.color.optional(),
  icon: categoryFields.icon.optional(),
});

export const categoryUpdateSchema = z
  .object({
    name: categoryFields.name.optional(),
    color: categoryFields.color.optional(),
    icon: categoryFields.icon.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const amount = z.coerce
  .number()
  .positive('Amount must be greater than 0')
  .max(1_000_000_000, 'Amount is too large');
const description = z.string().trim().max(500);
const spentAt = z.coerce.date();
const categoryId = z.string().uuid('Invalid category id').nullable();

export const expenseCreateSchema = z.object({
  amount,
  description: description.optional().default(''),
  spentAt: spentAt.optional(),
  categoryId: categoryId.optional(),
});

export const expenseUpdateSchema = z
  .object({
    amount: amount.optional(),
    description: description.optional(),
    spentAt: spentAt.optional(),
    categoryId: categoryId.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const expenseQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  categoryId: z.string().uuid('Invalid category id').optional(),
  search: z.string().trim().max(100).optional(),
  sort: z
    .enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])
    .optional()
    .default('date_desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const summaryQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
