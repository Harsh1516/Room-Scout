import { useState } from 'react';
import { saveDraftToStorage } from '../utils/hostDraftStorage';

export function useHostPerksRules({
  formData,
  setFormData,
  activeStep,
  googleMapsUrl,
  user,
  showToast = () => {},
}) {
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');

  const handleAddFacility = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = newFacilityInput.trim();
    if (!clean) return;
    if ((formData.facilities || formData.amenities || []).some((f) => f.toLowerCase() === clean.toLowerCase())) {
      showToast('This facility is already added.');
      setNewFacilityInput('');
      return;
    }
    const updated = [...(formData.facilities || formData.amenities || []), clean];
    setFormData((prev) => {
      const next = {
        ...prev,
        facilities: updated,
        amenities: updated,
      };
      saveDraftToStorage(next, activeStep, googleMapsUrl, user);
      return next;
    });
    setNewFacilityInput('');
  };

  const handleRemoveFacility = (facilityName, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const current = formData.facilities || formData.amenities || [];
    const updated = current.filter((f) => f !== facilityName);
    setFormData((prev) => {
      const next = {
        ...prev,
        facilities: updated,
        amenities: updated,
      };
      saveDraftToStorage(next, activeStep, googleMapsUrl, user);
      return next;
    });
  };

  const handleAddRule = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = newRuleInput.trim();
    if (!clean) return;
    if ((formData.rules || []).some((r) => r.toLowerCase() === clean.toLowerCase())) {
      showToast('This rule is already added.');
      setNewRuleInput('');
      return;
    }
    const updated = [...(formData.rules || []), clean];
    setFormData((prev) => {
      const next = {
        ...prev,
        rules: updated,
      };
      saveDraftToStorage(next, activeStep, googleMapsUrl, user);
      return next;
    });
    setNewRuleInput('');
  };

  const handleRemoveRule = (ruleIndex, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const updated = (formData.rules || []).filter((_, i) => i !== ruleIndex);
    setFormData((prev) => {
      const next = {
        ...prev,
        rules: updated,
      };
      saveDraftToStorage(next, activeStep, googleMapsUrl, user);
      return next;
    });
  };

  const handleUpdateFacility = (oldFacility, newFacility, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = (newFacility || '').trim();
    if (!clean || clean.toLowerCase() === (oldFacility || '').toLowerCase()) return;
    const current = formData.facilities || formData.amenities || [];
    const updated = current.map((f) => (f === oldFacility ? clean : f));
    setFormData((prev) => {
      const next = {
        ...prev,
        facilities: updated,
        amenities: updated,
      };
      saveDraftToStorage(next, activeStep, googleMapsUrl, user);
      return next;
    });
  };

  const handleUpdateRule = (ruleIndex, newRule, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const clean = (newRule || '').trim();
    if (!clean) return;
    const updated = (formData.rules || []).map((r, i) => (i === ruleIndex ? clean : r));
    setFormData((prev) => {
      const next = {
        ...prev,
        rules: updated,
      };
      saveDraftToStorage(next, activeStep, googleMapsUrl, user);
      return next;
    });
  };

  return {
    newFacilityInput,
    setNewFacilityInput,
    newRuleInput,
    setNewRuleInput,
    handleAddFacility,
    handleRemoveFacility,
    handleUpdateFacility,
    handleAddRule,
    handleRemoveRule,
    handleUpdateRule,
  };
}
