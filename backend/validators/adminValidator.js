import { z } from 'zod';

export const impersonateSchema = z.object({
  targetEmail: z
    .string({ required_error: 'targetEmail is required' })
    .trim()
    .email({ message: 'Valid targetEmail is required' }),
  targetRole: z.enum(['user', 'host']).optional(),
});

export const createAdminHostSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  phone: z.string().trim().optional(),
});
