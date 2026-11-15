/**
 * Fast synchronous & async image utilities for RoomScout:
 * - 16:9 Aspect Ratio Validation
 * - Canvas compression formula (downscaling to maxDim 1400, JPEG quality 0.82)
 * - Memory & file size estimation (KB / MB formatting)
 */

export const getSafeImgSrc = (src) => {
  if (!src) return '';
  const s = String(src).trim();
  if (!s.startsWith('http') && !s.startsWith('data:') && s.startsWith('image/')) {
    return `data:${s}`;
  }
  return s;
};

// Calculate exact byte size of base64 data URL without heavy regex
export const getBase64ByteSize = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  let b64 = dataUrl;
  if (dataUrl.startsWith('data:') || dataUrl.startsWith('image/')) {
    const commaIdx = dataUrl.indexOf(',');
    b64 = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  } else if (!dataUrl.startsWith('http') && !dataUrl.startsWith('/') && dataUrl.length > 200) {
    b64 = dataUrl;
  } else {
    return 0;
  }
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
};

// Format bytes into human-friendly unit
export const formatMemorySize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Fast synchronous image size estimator
export const getImageSize = (imgUrl) => {
  if (!imgUrl || typeof imgUrl !== 'string') return 0;
  if (imgUrl.startsWith('data:') || imgUrl.startsWith('image/')) {
    return getBase64ByteSize(imgUrl);
  }
  try {
    const entries = window.performance?.getEntriesByName?.(imgUrl) || [];
    const entry = entries[entries.length - 1];
    if (entry) {
      const perfSize = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;
      if (perfSize > 0) return perfSize;
    }
  } catch {}
  return 180 * 1024;
};

// Image Compression Formula: downscale max dimension to 1400px, JPEG quality 0.82
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error(`Failed to load image "${file.name}".`));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
};

// Validates 16:9 aspect ratio with a tolerance of 0.06
export const validate16x9Ratio = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve({ valid: false, message: 'Please select a valid image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve({ valid: false, message: 'Unable to detect image dimensions.' });
          return;
        }
        const ratio = width / height;
        const targetRatio = 16 / 9;
        const is16x9 = Math.abs(ratio - targetRatio) <= 0.06;
        if (!is16x9) {
          resolve({
            valid: false,
            message: 'Photos must be in 16:9 aspect ratio only.',
          });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => resolve({ valid: false, message: `Failed to read image "${file.name}".` });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ valid: false, message: `Failed to read file "${file.name}".` });
    reader.readAsDataURL(file);
  });
};
