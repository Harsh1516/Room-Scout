import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables reliably from backend directory or cwd
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'], {
        errorMap: () => ({ message: "NODE_ENV must be one of 'development', 'production', or 'test'" }),
      })
      .default('development'),

    PORT: z
      .string()
      .regex(/^\d+$/, { message: 'PORT must be a numeric integer string' })
      .transform(Number)
      .default('5000'),

    MONGO_URI: z
      .string({ required_error: 'MONGO_URI is required' })
      .trim()
      .min(1, { message: 'MONGO_URI cannot be empty' })
      .refine(
        (val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'),
        {
          message:
            'MONGO_URI must be a valid MongoDB connection string (starts with mongodb:// or mongodb+srv://)',
        }
      ),

    JWT_SECRET: z
      .string({ required_error: 'JWT_SECRET is required' })
      .trim()
      .min(1, { message: 'JWT_SECRET cannot be empty' }),

    ADMIN_KEY: z.string().trim().optional(),
    CLIENT_URL: z.string().trim().optional().default('http://localhost:5173'),
    ALLOWED_ORIGINS: z.string().trim().optional(),
    TRUST_PROXY: z.string().trim().optional(),

    // Payment Gateway (Razorpay)
    RAZORPAY_KEY_ID: z.string().trim().optional(),
    RAZORPAY_KEY_SECRET: z.string().trim().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional(),

    // Media Storage (Cloudinary)
    CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
    CLOUDINARY_API_KEY: z.string().trim().optional(),
    CLOUDINARY_API_SECRET: z.string().trim().optional(),

    // Caching & Distributed Rate Limiting (Redis)
    REDIS_URL: z.string().trim().optional(),

    // SMTP Mail Service
    EMAIL_HOST: z.string().trim().optional(),
    EMAIL_PORT: z.string().trim().optional(),
    EMAIL_USER: z.string().trim().optional(),
    EMAIL_PASS: z.string().trim().optional(),
    EMAIL_FROM: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. In production, JWT_SECRET must be at least 32 characters long
    if (data.NODE_ENV === 'production' && data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters long in production environments for cryptographic security.',
      });
    }

    // 2. Reject known insecure fallback / placeholder strings
    const INSECURE_DEFAULTS = [
      'dev_temporary_fallback_secret_key_roomscout_2026',
      'supersecret',
      'secret',
      'changeme',
      '123456',
      'password',
      'admin',
      'jwt_secret',
    ];
    if (INSECURE_DEFAULTS.includes(data.JWT_SECRET.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET is set to an insecure default placeholder. Please supply a cryptographically secure random secret.',
      });
    }

    // 3. If Razorpay Key is provided, Secret should also be provided
    if (data.RAZORPAY_KEY_ID && !data.RAZORPAY_KEY_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RAZORPAY_KEY_SECRET'],
        message: 'RAZORPAY_KEY_SECRET is required when RAZORPAY_KEY_ID is configured.',
      });
    }

    // 4. If Cloudinary credentials are provided, ensure all three are present
    const hasCloudName = Boolean(data.CLOUDINARY_CLOUD_NAME);
    const hasCloudKey = Boolean(data.CLOUDINARY_API_KEY);
    const hasCloudSecret = Boolean(data.CLOUDINARY_API_SECRET);
    if ((hasCloudName || hasCloudKey || hasCloudSecret) && !(hasCloudName && hasCloudKey && hasCloudSecret)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CLOUDINARY_CONFIG'],
        message: 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must all be configured together.',
      });
    }
  });

export function validateEnvironment(envSource = process.env, shouldExitOnError = true) {
  const result = envSchema.safeParse(envSource);

  if (!result.success) {
    console.error('\n' + '='.repeat(64));
    console.error('❌ FATAL SECURITY & ENVIRONMENT VALIDATION ERROR');
    console.error('The following environment variables are missing or malformed:');
    console.error('='.repeat(64));

    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.') || 'CONFIGURATION';
      console.error(`  ▸ [${field}]: ${issue.message}`);
    });

    console.error('='.repeat(64));
    console.error('Please configure the required variables in your .env file before starting.\n');

    if (shouldExitOnError && process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }

    const err = new Error('Environment validation failed');
    err.issues = result.error.issues;
    throw err;
  }

  return result.data;
}

export const env = validateEnvironment();
export default env;
