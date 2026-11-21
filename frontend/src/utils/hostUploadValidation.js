import { toast } from '../context/ToastContext';

export const validateHostStep = (stepNumber, formData, setFieldErrors = () => {}, shouldSetErrors = true) => {
  if (stepNumber === 1) {
    const cleanHostPhone = (formData?.phone || '').trim().replace(/\D/g, '');
    const raw10Phone =
      cleanHostPhone.length === 12 && cleanHostPhone.startsWith('91') ? cleanHostPhone.slice(2) : cleanHostPhone;

    if (!formData?.name || formData.name.trim().length < 2) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, name: 'Host name is required (min 2 characters).' }));
        toast.error('Host name min 2 chars');
      }
      return false;
    }

    if (!raw10Phone || raw10Phone.length < 10) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, phone: 'Host contact number must be at least 10 digits.' }));
        toast.error('Contact min 10 digits');
      }
      return false;
    }

    if (!formData?.propertyName || formData.propertyName.trim().length < 3) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, propertyName: 'Property name must be at least 3 characters long.' }));
        toast.error('Property name min 3 chars');
      }
      return false;
    }
    if (!formData?.propertyType) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, propertyType: 'Please select a property category (e.g. PG, Hotel, Flat).' }));
        toast.error('Select property category');
      }
      return false;
    }
    if (!formData?.genderType) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, genderType: 'Please select who this stay is available for.' }));
        toast.error('Select target occupants');
      }
      return false;
    }
    return true;
  }

  if (stepNumber === 2) {
    const errors = {};
    if (!formData?.roadArea || formData.roadArea.trim().length < 2) errors.roadArea = 'Street / Road name is required.';
    if (!formData?.city || formData.city.trim().length < 2) errors.city = 'City is required.';
    if (!formData?.state || formData.state.trim().length < 2) errors.state = 'State is required.';
    if (!formData?.pincode || formData.pincode.trim().length < 4) errors.pincode = 'Valid PIN code is required.';

    if (Object.keys(errors).length > 0) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        const firstMsg = Object.values(errors)[0] || 'Please complete all address details.';
        toast.error(firstMsg.length > 25 ? 'Complete address details' : firstMsg);
      }
      return false;
    }
    return true;
  }

  if (stepNumber === 3) {
    const facilities = formData?.facilities && formData.facilities.length > 0 ? formData.facilities : formData?.amenities;
    if (!facilities || facilities.length === 0) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, facilities: 'Please select at least 1 facility/amenity.' }));
        toast.error('Select at least 1 facility');
      }
      return false;
    }
    if (!formData?.rules || formData.rules.length === 0) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, rules: 'Please select at least 1 house rule.' }));
        toast.error('Select at least 1 rule');
      }
      return false;
    }
    return true;
  }

  if (stepNumber === 4) {
    if (!formData?.images || formData.images.length === 0) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, images: 'Please upload at least 1 showcase photo.' }));
        toast.error('Upload at least 1 photo');
      }
      return false;
    }
    return true;
  }

  if (stepNumber === 5) {
    if (!formData?.description || formData.description.trim().length < 10) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, description: 'Description must be at least 10 characters long.' }));
        toast.error('Description min 10 chars');
      }
      return false;
    }
    const validRates = (formData?.roomRates || []).filter((r) => (r.type || '').trim());
    if (validRates.length === 0) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, roomRates: 'Please configure at least 1 room category.' }));
        toast.error('Set at least 1 room rate');
      }
      return false;
    }
    const validRooms = (formData?.rooms || []).filter((rm) => (rm.roomNumber || '').trim());
    if (validRooms.length === 0) {
      if (shouldSetErrors) {
        setFieldErrors((prev) => ({ ...prev, rooms: 'Please add at least 1 room card.' }));
        toast.error('Add at least 1 room card');
      }
      return false;
    }
    return true;
  }

  return true;
};

export const canAccessHostStep = (targetStepId, formData) => {
  if (targetStepId <= 1) return true;
  for (let s = 1; s < targetStepId; s++) {
    if (!validateHostStep(s, formData, () => {}, false)) {
      return false;
    }
  }
  return true;
};
