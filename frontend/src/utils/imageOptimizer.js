/**
 * Dynamic URL transformer for Cloudinary and Unsplash images.
 * Automatically injects WebP/AVIF format, auto-quality compression, and responsive width limits.
 *
 * @param {string} url - The original image URL
 * @param {number} width - Target maximum width in pixels (defaults to 640 for cards/thumbnails)
 * @returns {string} - The optimized CDN delivery URL
 */
export function getOptimizedImageUrl(url, width = 640) {
  if (!url || typeof url !== 'string') return url || '';

  // 1. Cloudinary on-the-fly transformation
  if (url.includes('res.cloudinary.com')) {
    const uploadIdx = url.indexOf('/upload/');
    if (uploadIdx !== -1) {
      const prefix = url.slice(0, uploadIdx + 8); // includes '/upload/'
      const rest = url.slice(uploadIdx + 8);

      // Avoid double-transforming if already transformed
      if (!rest.startsWith('f_auto') && !rest.startsWith('w_') && !rest.startsWith('c_')) {
        return `${prefix}f_auto,q_auto,w_${width},c_limit/${rest}`;
      }
    }
    return url;
  }

  // 2. Unsplash on-the-fly transformation
  if (url.includes('images.unsplash.com')) {
    if (url.includes('w=')) {
      return url.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, 'q=75');
    }
    return `${url}${url.includes('?') ? '&' : '?'}auto=format&fit=crop&w=${width}&q=75`;
  }

  return url;
}
