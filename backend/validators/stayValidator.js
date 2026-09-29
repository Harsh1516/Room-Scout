import { z } from 'zod';
import { mongoIdSchema, singleImageSchema, listingImagesArraySchema } from './commonValidator.js';

// Create Stay Listing Schema
export const createStaySchema = z.object({
  title: z
    .string({ required_error: 'Property title is required' })
    .trim()
    .min(3, { message: 'Title must be at least 3 characters long' })
    .max(120, { message: 'Title cannot exceed 120 characters' }),
  type: z
    .string()
    .trim()
    .default('PG'),
  location: z
    .string({ required_error: 'Location is required' })
    .trim()
    .min(2, { message: 'Location must be at least 2 characters long' })
    .max(200, { message: 'Location cannot exceed 200 characters' }),
  price: z.coerce
    .number({ required_error: 'Starting price is required' })
    .positive({ message: 'Price must be a positive number greater than 0' }),
  rateUnit: z
    .string()
    .trim()
    .default('/month'),
  description: z.string().trim().max(5000).optional(),
  address: z.string().trim().max(300).optional(),
  roadArea: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
  latitude: z.coerce
    .number()
    .min(-90, { message: 'Latitude must be between -90 and 90' })
    .max(90, { message: 'Latitude must be between -90 and 90' })
    .optional(),
  longitude: z.coerce
    .number()
    .min(-180, { message: 'Longitude must be between -180 and 180' })
    .max(180, { message: 'Longitude must be between -180 and 180' })
    .optional(),
  image: singleImageSchema.optional(),
  images: listingImagesArraySchema.optional(),
  facilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  instagramVideoUrl: z.string().trim().optional(),
  rooms: z.array(z.any()).optional(),
  roomRates: z.array(z.any()).optional(),
  hostId: mongoIdSchema.optional(),
});

// Resolve Map Link Schema
export const resolveMapSchema = z.object({
  url: z
    .string({ required_error: 'Google Maps URL is required' })
    .trim()
    .min(1, { message: 'URL cannot be empty' }),
});

// Add Review Schema
export const reviewSchema = z.object({
  rating: z.coerce
    .number({ required_error: 'Star rating is required' })
    .int({ message: 'Rating must be an integer' })
    .min(1, { message: 'Rating must be at least 1 star' })
    .max(5, { message: 'Rating cannot exceed 5 stars' }),
  comment: z
    .string({ required_error: 'Review comment is required' })
    .trim()
    .min(2, { message: 'Comment must be at least 2 characters' })
    .max(1500, { message: 'Comment cannot exceed 1500 characters' }),
  userName: z.string().trim().optional(),
});

// Update Review Schema
export const updateReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, { message: 'Rating must be at least 1 star' })
    .max(5, { message: 'Rating cannot exceed 5 stars' })
    .optional(),
  comment: z
    .string()
    .trim()
    .min(2, { message: 'Comment must be at least 2 characters' })
    .max(1500, { message: 'Comment cannot exceed 1500 characters' })
    .optional(),
});

// Update Stay Rooms Schema
export const updateStayRoomsSchema = z.object({
  availableRooms: z.coerce.number().int().min(0).optional(),
  decrement: z.boolean().optional(),
});

// Params schemas for review routes
export const reviewParamsSchema = z.object({
  id: mongoIdSchema,
  reviewId: mongoIdSchema,
});
