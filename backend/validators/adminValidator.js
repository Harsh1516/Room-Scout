import { z } from 'zod';

export const impersonateSchema = z
  .object({
    targetEmail: z.string().trim().email({ message: 'Valid email is required' }).optional(),
    email: z.string().trim().email({ message: 'Valid email is required' }).optional(),
    targetRole: z.enum(['user', 'host']).optional(),
    role: z.enum(['user', 'host']).optional(),
    id: z.string().trim().optional(),
    _id: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.targetEmail || data.email), {
    message: 'email or targetEmail is required',
  });

export const createAdminHostSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  phone: z.string().trim().optional(),
});
