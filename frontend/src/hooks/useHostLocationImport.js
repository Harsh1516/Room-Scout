import { useState } from 'react';
import { toast } from '../context/ToastContext';
import { fetchAddressFromCoords, parseGoogleMapsUrl } from '../utils/geoUtils';
import { staysAPI } from '../services/api';

export function useHostLocationImport({ formData, setFormData, googleMapsUrl, showToast = () => {} }) {
  const [isImportingGMap, setIsImportingGMap] = useState(false);

  const handleMapLocationChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleAddressDetected = (detected) => {
    if (!detected) return;
    setFormData((prev) => ({
      ...prev,
      roadArea: detected.roadArea ? detected.roadArea.trim() : prev.roadArea,
      city: detected.city ? detected.city.trim() : prev.city,
      state: detected.state ? detected.state.trim() : prev.state,
      pincode: detected.pincode ? detected.pincode.trim() : prev.pincode,
    }));
    showToast('Address details updated from map location!', 'success');
  };

  const handleImportGoogleMaps = async () => {
    const rawUrl = (googleMapsUrl || '').trim();
    if (!rawUrl) {
      toast.error('Please paste a Google Maps link first.');
      return;
    }

    try {
      setIsImportingGMap(true);

      let lat = null;
      let lng = null;
      let detectedPlace = '';

      const parsed = parseGoogleMapsUrl(rawUrl);
      if (parsed) {
        lat = parsed.latitude;
        lng = parsed.longitude;
        detectedPlace = parsed.detectedPlace || '';
      }

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        try {
          const res = await staysAPI.resolveMapLink(rawUrl);
          if (res && res.success && res.latitude && res.longitude) {
            lat = res.latitude;
            lng = res.longitude;
            if (res.placeName) detectedPlace = res.placeName;
            setFormData((prev) => ({
              ...prev,
              roadArea: res.roadArea || prev.roadArea,
              city: res.city || prev.city,
              state: res.state || prev.state,
              pincode: res.pincode || prev.pincode,
            }));
          }
        } catch (apiErr) {
          console.warn('Backend link resolve note:', apiErr);
        }
      }

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        toast.error(
          'Could not extract coordinates from this link. You can paste the coordinates directly (e.g. 29°22\'29.4"N 79°31\'39.9"E) or the full Google Maps URL.'
        );
        return;
      }

      const fixedLat = Number(lat);
      const fixedLng = Number(lng);

      setFormData((prev) => ({
        ...prev,
        latitude: fixedLat,
        longitude: fixedLng,
      }));

      try {
        const detectedAddr = await fetchAddressFromCoords(fixedLat, fixedLng, {
          rawUrl,
          detectedPlace,
        });

        if (detectedAddr) {
          setFormData((prev) => ({
            ...prev,
            roadArea: detectedAddr.roadArea || prev.roadArea,
            city: detectedAddr.city || prev.city,
            state: detectedAddr.state || prev.state,
            pincode: detectedAddr.pincode || prev.pincode,
          }));
        }
      } catch (revErr) {
        console.warn('Reverse geocode error:', revErr);
      }

      toast.success('Location imported & address details filled!');
    } catch (err) {
      console.error('Import Google Maps error:', err);
      toast.error(`Failed to import location: ${err.message || 'Please try again'}`);
    } finally {
      setIsImportingGMap(false);
    }
  };

  return {
    isImportingGMap,
    handleMapLocationChange,
    handleAddressDetected,
    handleImportGoogleMaps,
  };
}
