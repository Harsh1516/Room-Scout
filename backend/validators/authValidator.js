import { z } from 'zod';
import { avatarImageSchema } from './commonValidator.js';

// Registration / Signup Validation Schema
export const signupSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' })
      .max(60, { message: 'Name cannot exceed 60 characters' }),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .min(1, { message: 'Email address is required' })
      .email({ message: 'Please enter a valid email address' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters long' })
      .max(128, { message: 'Password cannot exceed 128 characters' }),
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
      .enum(['user', 'host'], {
        invalid_type_error: 'Role must be user or host',
      })
      .default('user'),
  })
  .strict({ message: 'Unrecognized fields submitted in registration payload' });

export const registerSchema = signupSchema;

// Login Validation Schema
export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .min(1, { message: 'Email address is required' })
      .email({ message: 'Please enter a valid email address' }),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, { message: 'Password is required' })
      .max(128, { message: 'Password length is invalid' }),
    requiredRole: z.enum(['user', 'host', 'admin']).optional(),
    role: z.enum(['user', 'host', 'admin']).optional(),
  })
  .strict({ message: 'Unrecognized fields submitted in login payload' });

// Forgot Password Schema
export const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .min(1, { message: 'Email address is required' })
      .email({ message: 'Please enter a valid email address' }),
    role: z.enum(['user', 'host']).optional(),
  })
  .strict();

// Update Profile Schema
export const updateProfileSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' })
      .max(60, { message: 'Name cannot exceed 60 characters' }),
    phone: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const digits = val.replace(/\D/g, '');
          return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
        },
        { message: 'Please enter a valid 10-digit phone number' }
      ),
    avatar: avatarImageSchema.optional(),
  })
  .strict();

// Change Password Schema
export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, { message: 'Current password is required' }),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, { message: 'New password must be at least 6 characters long' })
      .max(128, { message: 'Password cannot exceed 128 characters' }),
  })
  .strict();
