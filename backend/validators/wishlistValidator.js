import { z } from 'zod';
import { mongoIdSchema } from './commonValidator.js';

export const toggleWishlistSchema = z.object({
  stayId: mongoIdSchema,
});

export const wishlistParamSchema = z.object({
  stayId: mongoIdSchema,
});
