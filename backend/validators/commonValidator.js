import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Validates a 24-character hexadecimal MongoDB ObjectId string.
 */
export const mongoIdSchema = z
  .string({ required_error: 'ID parameter is required' })
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid MongoDB ObjectId format',
  });

/**
 * Standard schema for routes taking /:id
 */
export const idParamSchema = z
  .object({
    id: mongoIdSchema,
  })
  .strict();

/**
 * Standard schema for routes taking /:stayId
 */
export const stayIdParamSchema = z
  .object({
    stayId: mongoIdSchema,
  })
  .strict();

/**
 * Reusable schema for pagination query params
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  paginate: z.enum(['true', 'false']).optional(),
  sort: z.string().optional(),
});

import { validateImageString, validateImageArray, MAX_STAY_IMAGES } from '../utils/imageSecurity.js';

/**
 * Validates a single image (URL or Base64 with magic bytes and 5 MB size cap).
 */
export const singleImageSchema = z.string().superRefine((val, ctx) => {
  if (!val) return;
  const res = validateImageString(val, { fieldName: 'image' });
  if (!res.valid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error });
  }
});

/**
 * Validates a user or host avatar (initials up to 4 chars OR single valid image under 5 MB).
 */
export const avatarImageSchema = z.string().superRefine((val, ctx) => {
  if (!val) return;
  const res = validateImageString(val, { allowInitials: true, fieldName: 'avatar' });
  if (!res.valid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error });
  }
});

/**
 * Validates a listing images array (maximum 8 images, each validated for size, MIME, and magic bytes).
 */
export const listingImagesArraySchema = z
  .array(singleImageSchema)
  .max(MAX_STAY_IMAGES, { message: `Maximum of ${MAX_STAY_IMAGES} images allowed per listing.` })
  .superRefine((arr, ctx) => {
    if (!arr) return;
    const res = validateImageArray(arr);
    if (!res.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error });
    }
  });

