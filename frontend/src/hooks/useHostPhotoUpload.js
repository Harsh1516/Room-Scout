import { useState, useRef } from 'react';
import { toast } from '../context/ToastContext';
import { MAX_PHOTOS } from '../utils/hostDraftStorage';

export const compressImage = (file) => {
  return new Promise((resolve) => {
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
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

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

export function useHostPhotoUpload({ formData, setFormData, showToast = () => {} }) {
  const fileInputRef = useRef(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleFileUpload = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const files = Array.from(e?.target?.files || []);
    if (files.length === 0) return;

    if (formData.images.length >= MAX_PHOTOS) {
      showToast(`Maximum limit of ${MAX_PHOTOS} photos reached.`);
      return;
    }

    const remainingSlots = MAX_PHOTOS - formData.images.length;
    const filesToUpload = files.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      const validation = await validate16x9Ratio(file);
      if (!validation.valid) {
        toast.error(validation.message || 'Photos must be in 16:9 aspect ratio only.');
        continue;
      }
      try {
        const compressedDataUrl = await compressImage(file);
        setFormData((prev) => {
          if (prev.images.length >= MAX_PHOTOS) return prev;
          const updated = [...prev.images, compressedDataUrl];
          return {
            ...prev,
            images: updated,
            image: updated[0] || '',
          };
        });
        showToast(`Photo "${file.name}" added to showcase!`);
      } catch (err) {
        console.warn('Image compression error:', err);
      }
    }

    if (files.length > remainingSlots) {
      showToast(`Only ${remainingSlots} photo(s) added. Maximum limit is ${MAX_PHOTOS} photos.`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetCoverPhoto = (imgUrl, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setFormData((prev) => {
      const remaining = prev.images.filter((img) => img !== imgUrl);
      return {
        ...prev,
        images: [imgUrl, ...remaining],
        image: imgUrl,
      };
    });
    showToast('Cover photo updated! ⭐', 'success');
  };

  const handleRemovePhoto = (imgUrl, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setFormData((prev) => {
      const remaining = prev.images.filter((img) => img !== imgUrl);
      return {
        ...prev,
        images: remaining,
        image: remaining[0] || '',
      };
    });
    showToast('Photo removed.');
  };

  const handleReplacePhoto = async (index, file) => {
    if (!file) return;
    const validation = await validate16x9Ratio(file);
    if (!validation.valid) {
      toast.error(validation.message || 'Photos must be in 16:9 aspect ratio only.');
      return;
    }
    try {
      const compressedDataUrl = await compressImage(file);
      setFormData((prev) => {
        const updated = [...(prev.images || [])];
        updated[index] = compressedDataUrl;
        return {
          ...prev,
          images: updated,
          image: updated[0] || '',
        };
      });
      const PHOTO_LABELS = ['Front View', 'Side View', 'Balcony', 'Parking'];
      const label = PHOTO_LABELS[index] || `Photo ${index + 1}`;
      showToast(`${label} photo updated!`, 'success');
    } catch (err) {
      console.warn('Image replace error:', err);
    }
  };

  const handleSlotUpload = async (targetIndex, filesList) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      const slotIndex = targetIndex + fIdx;
      if (slotIndex >= MAX_PHOTOS) break;

      const validation = await validate16x9Ratio(file);
      if (!validation.valid) {
        toast.error(validation.message || 'Photos must be in 16:9 aspect ratio only.');
        continue;
      }
      try {
        const compressedDataUrl = await compressImage(file);
        setFormData((prev) => {
          const updated = [...(prev.images || [])];
          if (slotIndex < updated.length) {
            updated[slotIndex] = compressedDataUrl;
          } else {
            updated.push(compressedDataUrl);
          }
          const trimmed = updated.slice(0, MAX_PHOTOS);
          return {
            ...prev,
            images: trimmed,
            image: trimmed[0] || '',
          };
        });
        const PHOTO_LABELS = ['Front View', 'Side View', 'Balcony', 'Parking'];
        const label = PHOTO_LABELS[slotIndex] || `Photo ${slotIndex + 1}`;
        showToast(`${label} photo added!`, 'success');
      } catch (err) {
        console.warn('Slot photo upload error:', err);
      }
    }
  };

  const handlePhotoDragStart = (e, index) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhotoDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handlePhotoDragLeave = (e, index) => {
    e.preventDefault();
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handlePhotoDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null);
      setDragOverIndex(null);
      return;
    }

    setFormData((prev) => {
      const updated = [...prev.images];
      const [draggedItem] = updated.splice(draggedPhotoIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return {
        ...prev,
        images: updated,
        image: updated[0] || '',
      };
    });

    setDraggedPhotoIndex(null);
    setDragOverIndex(null);
    showToast('Photos reordered!');
  };

  return {
    fileInputRef,
    draggedPhotoIndex,
    dragOverIndex,
    handleFileUpload,
    handleSetCoverPhoto,
    handleRemovePhoto,
    handleReplacePhoto,
    handleSlotUpload,
    handlePhotoDragStart,
    handlePhotoDragOver,
    handlePhotoDragLeave,
    handlePhotoDrop,
  };
}
