import { z } from 'zod';

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
