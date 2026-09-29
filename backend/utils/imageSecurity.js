import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const MAX_STAY_IMAGES = 8;

// Initialize Cloudinary with validated environment credentials
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Inspects the leading binary bytes of an image buffer to detect true MIME type.
 * Eliminates file spoofing where non-image/executable files are renamed with image extensions.
 *
 * Magic Byte signatures:
 * - JPEG: FF D8 FF
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
 */
export function detectImageMimeFromBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 3. WebP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Validates a single image string (either a URL or Base64 data URI).
 */
export function validateImageString(
  rawString,
  {
    maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
    allowInitials = false,
    fieldName = 'image',
  } = {}
) {
  if (!rawString || typeof rawString !== 'string') {
    return { valid: false, error: `${fieldName} is required and must be a string.` };
  }

  const trimmed = rawString.trim();

  // Allow avatar initials (e.g. 'US', 'HO', 'JD')
  if (allowInitials && trimmed.length <= 4 && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
    const isAlphanumeric = /^[a-zA-Z0-9_-]+$/.test(trimmed);
    if (isAlphanumeric) {
      return { valid: true, type: 'initials', value: trimmed.toUpperCase() };
    }
  }

  // Case 1: Hosted Remote URL (e.g. Cloudinary, Unsplash)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Prevent SVG stored XSS via URL
    const urlLower = trimmed.toLowerCase();
    if (urlLower.includes('.svg') || urlLower.includes('image/svg')) {
      return {
        valid: false,
        error: `${fieldName} contains an SVG vector file, which is prohibited to prevent script injection vulnerabilities.`,
      };
    }

    if (urlLower.includes('javascript:') || urlLower.includes('<script')) {
      return { valid: false, error: `${fieldName} contains malicious script content.` };
    }

    try {
      new URL(trimmed);
      return { valid: true, type: 'url', value: trimmed };
    } catch {
      return { valid: false, error: `${fieldName} is not a valid URL.` };
    }
  }

  // Case 2: Base64 Data URI
  if (trimmed.startsWith('data:')) {
    // Explicitly reject SVGs or non-image types in header
    if (trimmed.startsWith('data:image/svg')) {
      return {
        valid: false,
        error: `SVG uploads are strictly prohibited to prevent SVG-based Stored XSS vectors. Only JPEG, PNG, and WebP are allowed.`,
      };
    }

    const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
    const match = trimmed.match(base64Regex);

    if (!match) {
      return {
        valid: false,
        error: `Invalid ${fieldName} format. Must be a valid Base64 data URI matching image/jpeg, image/png, or image/webp.`,
      };
    }

    const declaredSubtype = match[1].toLowerCase().replace('jpg', 'jpeg');
    const base64Payload = match[2];

    // Estimate decoded byte length before allocation
    const padding = base64Payload.endsWith('==') ? 2 : base64Payload.endsWith('=') ? 1 : 0;
    const estimatedBytes = Math.floor((base64Payload.length * 3) / 4) - padding;

    if (estimatedBytes > maxSizeBytes) {
      const mbSize = (estimatedBytes / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `${fieldName} exceeds maximum allowed size of 5 MB (decoded size is ~${mbSize} MB).`,
      };
    }

    // Decode to binary buffer
    let buffer;
    try {
      buffer = Buffer.from(base64Payload, 'base64');
    } catch {
      return { valid: false, error: `Malformed Base64 payload in ${fieldName}.` };
    }

    if (buffer.length > maxSizeBytes) {
      const mbSize = (buffer.length / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `${fieldName} exceeds maximum allowed size of 5 MB (${mbSize} MB).`,
      };
    }

    // Magic byte inspection: Detect true file signature
    const detectedMime = detectImageMimeFromBuffer(buffer);
    if (!detectedMime) {
      return {
        valid: false,
        error: `Invalid ${fieldName} content: File signature does not match allowed image formats (JPEG, PNG, WebP). Renamed executables, scripts, or non-image files are rejected.`,
      };
    }

    // MIME Spoofing Check: Verify declared header matches binary magic bytes
    if (detectedMime !== `image/${declaredSubtype}`) {
      return {
        valid: false,
        error: `MIME-type mismatch: Declared format is image/${declaredSubtype} but file signature indicates ${detectedMime}.`,
      };
    }

    return {
      valid: true,
      type: 'base64',
      mime: detectedMime,
      size: buffer.length,
      buffer,
      value: trimmed,
    };
  }

  return {
    valid: false,
    error: `${fieldName} must be a valid HTTP/HTTPS URL or Base64 data URI (image/jpeg, image/png, image/webp).`,
  };
}

/**
 * Validates an array of image strings against size, MIME, magic byte, and array cap rules.
 */
export function validateImageArray(
  imagesArray,
  {
    maxCount = MAX_STAY_IMAGES,
    maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
    fieldName = 'images',
  } = {}
) {
  if (!imagesArray) {
    return { valid: true };
  }

  if (!Array.isArray(imagesArray)) {
    return { valid: false, error: `${fieldName} must be an array of image strings.` };
  }

  if (imagesArray.length > maxCount) {
    return {
      valid: false,
      error: `Exceeded maximum image count limit. Maximum of ${maxCount} images allowed per listing (received ${imagesArray.length}).`,
    };
  }

  for (let i = 0; i < imagesArray.length; i++) {
    const res = validateImageString(imagesArray[i], {
      maxSizeBytes,
      fieldName: `${fieldName}[${i}]`,
    });
    if (!res.valid) {
      return res;
    }
  }

  return { valid: true };
}

/**
 * Securely uploads an image to Cloudinary using server-generated identifiers and forced WebP format.
 */
export async function uploadSecureImage(imageInput, folder = 'roomscout/stays') {
  if (!imageInput || typeof imageInput !== 'string') return '';

  const trimmed = imageInput.trim();

  // If already a hosted URL, validate and return
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const val = validateImageString(trimmed);
    if (!val.valid) throw new Error(val.error);
    return trimmed;
  }

  // If Base64 string, strictly validate before initiating cloud stream
  if (trimmed.startsWith('data:image/')) {
    const val = validateImageString(trimmed);
    if (!val.valid) {
      throw new Error(val.error);
    }

    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
      console.warn('[Cloudinary] Cloudinary credentials not configured; keeping local Base64 string.');
      return trimmed;
    }

    // Generate unguessable random server-side filename (never use client-supplied names)
    const randomId = `rs_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    try {
      const uploadRes = await cloudinary.uploader.upload(trimmed, {
        folder,
        public_id: randomId,
        overwrite: false,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        format: 'webp', // Force delivery format to WebP to eliminate polyglot attacks and optimize performance
        transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
        tags: ['roomscout', folder.replace(/[^a-zA-Z0-9_-]/g, '_')],
      });

      return uploadRes.secure_url;
    } catch (err) {
      console.error('Secure Cloudinary upload error:', err.message);
      throw new Error(`Failed to upload image to cloud storage: ${err.message}`);
    }
  }

  return trimmed;
}
