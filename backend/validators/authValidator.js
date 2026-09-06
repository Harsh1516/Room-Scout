import { z } from 'zod';

// Login Validation Schema
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' }),
  requiredRole: z.enum(['user', 'host', 'admin']).optional(),
  role: z.enum(['user', 'host', 'admin']).optional(),
});

// Registration / Signup Validation Schema
export const signupSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name cannot exceed 50 characters' }),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
      message: 'Password must contain at least one letter and one number',
    }),
  phone: z
    .string({ required_error: 'Contact phone number is required' })
    .trim()
    .min(1, { message: 'Contact phone number is required' })
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
      },
      {
        message: 'Please enter a valid 10-digit mobile number',
      }
    )
    .transform((val) => {
      const digits = val.replace(/\D/g, '').slice(-10);
      return `+91 ${digits}`;
    }),
  role: z
    .enum(['user', 'host', 'admin'], {
      invalid_type_error: 'Role must be user, host, or admin',
    })
    .default('user'),
});

export const registerSchema = signupSchema;
