import { getSocket } from '../services/socket';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Check, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, staysAPI, paymentsAPI } from '../services/api';
import { Left } from '../components/navbar/Left';
import { Login } from '../components/navbar/Login';
import { toast } from '../context/ToastContext';
import { HostUploadTabs } from '../components/host/HostUploadTabs';
import { UploadBasicsTab } from '../components/host/upload/UploadBasicsTab';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { fetchAddressFromCoords, parseGoogleMapsUrl } from '../utils/geoUtils';
import { isRoomMatchingCategory } from '../utils/dateUtils';

import { UploadLocationTab } from '../components/host/upload/UploadLocationTab';
import { UploadPerksRulesTab } from '../components/host/upload/UploadPerksRulesTab';
import { UploadPhotosTab } from '../components/host/upload/UploadPhotosTab';
import { UploadRoomsPricingTab } from '../components/host/upload/UploadRoomsPricingTab';
import { UploadUpiTab } from '../components/host/upload/UploadUpiTab';
import UploadProgressModal from '../components/host/upload/UploadProgressModal';
import { saveImagesToIndexedDB, loadImagesFromIndexedDB, clearImagesFromIndexedDB } from '../utils/draftStorage';

import {
  MAX_PHOTOS,
  MAX_DESCRIPTION_CHARS,
  WIZARD_STEPS,
  hostPropertySchema,
  DEFAULT_HOST_FORM_DATA,
  CANONICAL_DRAFT_KEY,
  getDraftStorageKey,
  saveDraftToStorage,
  clearDraftFromStorage,
  loadDraftFromStorage,
  reconcileRoomsWithRates,
} from '../utils/hostDraftStorage';
import { useHostRoomForm } from '../hooks/useHostRoomForm';
import { useHostPerksRules } from '../hooks/useHostPerksRules';
import { useHostPhotoUpload } from '../hooks/useHostPhotoUpload';
import { useHostLocationImport } from '../hooks/useHostLocationImport';
import { validateHostStep, canAccessHostStep } from '../utils/hostUploadValidation';

export function HostUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserSession } = useAuth();


  // Stepper state (1 to 6) initialized from navigation state or draft
  const [activeStep, setActiveStep] = useState(() => {
    if (location.state?.initialStep && Number(location.state.initialStep) >= 1 && Number(location.state.initialStep) <= 6) {
      return Number(location.state.initialStep);
    }
    const draft = loadDraftFromStorage(user);
    if (draft?.activeStep && Number(draft.activeStep) >= 1 && Number(draft.activeStep) <= 6) {
      return Number(draft.activeStep);
    }
    return 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [pendingNavigateHost, setPendingNavigateHost] = useState(null);
  const [isEditing, setIsEditing] = useState(() => {
    const passed = location.state?.hostProperty;
    return Boolean(
      location.state?.fromDashboard &&
      passed &&
      typeof passed === 'object' &&
      (passed.propertyName || passed.title)
    );
  });
  const [hasUploadedProperty, setHasUploadedProperty] = useState(() => {
    const passed = location.state?.hostProperty;
    return Boolean(
      location.state?.fromDashboard &&
      passed &&
      typeof passed === 'object' &&
      (passed.propertyName || passed.title)
    );
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close steps navigation panel on Escape key press (matching LeftPropertiesPanel)
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);



  // Google Maps Import Link State initialized from draft if present
  const [googleMapsUrl, setGoogleMapsUrl] = useState(() => {
    try {
      const draft = loadDraftFromStorage(user);
      return draft?.googleMapsUrl || '';
    } catch {
      return '';
    }
  });

  // Form State initialized from draft (persists across reload), live dashboard navigation state, or default
  const [formData, setFormData] = useState(() => {
    // 1. Prioritize draft from localStorage strictly for THIS user
    const draft = loadDraftFromStorage(user);
    const passedProp = location.state?.hostProperty;

    const targetEmail = (user?.email || '').trim().toLowerCase();
    const targetId = (user?._id || '').toString();

    // Verify passedProp strictly belongs to this authenticated user
    const isPassedPropValid = Boolean(
      passedProp &&
      typeof passedProp === 'object' &&
      (
        (targetEmail && (
          (passedProp.email && passedProp.email.trim().toLowerCase() === targetEmail) ||
          (passedProp.hostEmail && passedProp.hostEmail.trim().toLowerCase() === targetEmail)
        )) ||
        (targetId && (
          (passedProp.hostId && String(passedProp.hostId?._id || passedProp.hostId) === targetId) ||
          (passedProp._id && String(passedProp._id) === targetId)
        ))
      )
    );
    const safePassedProp = isPassedPropValid ? passedProp : null;

    if (draft?.formData && typeof draft.formData === 'object') {
      const merged = {
        ...DEFAULT_HOST_FORM_DATA,
        ...(safePassedProp || {}),
        ...draft.formData,
      };

      if (!merged.name && user?.name) merged.name = user.name;
      if (!merged.email && user?.email) merged.email = user.email;
      if (!merged.phone && user?.phone) merged.phone = user.phone;

      const draftFacs = Array.isArray(draft.formData.facilities)
        ? draft.formData.facilities
        : (Array.isArray(draft.formData.amenities) ? draft.formData.amenities : []);
      merged.facilities = draftFacs;
      merged.amenities = draftFacs;
      merged.rules = Array.isArray(draft.formData.rules) ? draft.formData.rules : [];

      if (Array.isArray(merged.rooms) || Array.isArray(merged.roomRates)) {
        const { rates: hydratedRates, rooms: hydratedRooms } = reconcileRoomsWithRates(
          merged.rooms,
          merged.roomRates
        );
        merged.roomRates = hydratedRates;
        merged.rooms = hydratedRooms;
      } else {
        merged.rooms = [];
        merged.roomRates = [];
      }
      return merged;
    }

    // 2. If no draft exists yet, use verified safe hostProperty passed from dashboard navigation
    if (safePassedProp) {
      const { rates: loadedRates, rooms: loadedRooms } = reconcileRoomsWithRates(
        safePassedProp.rooms,
        safePassedProp.roomRates
      );

      const rawImgs = Array.isArray(safePassedProp.images) && safePassedProp.images.length > 0
        ? safePassedProp.images
        : (safePassedProp.image ? [safePassedProp.image] : []);
      const cleanImgs = rawImgs
        .map((img) => {
          const str = String(img || '').trim();
          if (!str.startsWith('http') && !str.startsWith('data:') && str.startsWith('image/')) {
            return `data:${str}`;
          }
          return str;
        })
        .filter(Boolean)
        .slice(0, MAX_PHOTOS);

      const hydrated = {
        ...DEFAULT_HOST_FORM_DATA,
        name: safePassedProp.name || user?.name || '',
        email: safePassedProp.email || user?.email || '',
        phone: safePassedProp.phone || user?.phone || '',
        propertyName: safePassedProp.propertyName || safePassedProp.title || '',
        propertyType: safePassedProp.propertyType || safePassedProp.type || 'PG',
        genderType: safePassedProp.genderType || 'Both',
        price: safePassedProp.price ? String(safePassedProp.price).replace(/[^0-9]/g, '') : (loadedRates[0]?.price ? String(loadedRates[0].price).replace(/[^0-9]/g, '') : ''),
        rateUnit: safePassedProp.rateUnit || loadedRates[0]?.rateUnit || '/month',
        roadArea: safePassedProp.roadArea || '',
        pincode: safePassedProp.pincode || '',
        city: safePassedProp.city || '',
        state: safePassedProp.state || '',
        latitude: Number(safePassedProp.latitude) || 29.3919,
        longitude: Number(safePassedProp.longitude) || 79.4542,
        totalRooms: safePassedProp.totalRooms || loadedRooms.length || 0,
        availableRooms: safePassedProp.availableRooms !== undefined ? safePassedProp.availableRooms : loadedRooms.length,
        rating: Number(safePassedProp.rating) || 5.0,
        image: cleanImgs[0] || safePassedProp.image || '',
        images: cleanImgs,
        instagramVideoUrl: safePassedProp.instagramVideoUrl || '',
        description: safePassedProp.description || safePassedProp.bio || '',
        facilities: Array.isArray(safePassedProp.facilities) ? safePassedProp.facilities : (Array.isArray(safePassedProp.amenities) ? safePassedProp.amenities : []),
        amenities: Array.isArray(safePassedProp.amenities) ? safePassedProp.amenities : (Array.isArray(safePassedProp.facilities) ? safePassedProp.facilities : []),
        rules: Array.isArray(safePassedProp.rules) ? safePassedProp.rules : [],
        roomRates: loadedRates,
        rooms: loadedRooms,
        status: safePassedProp.status || 'Pending Approval',
      };

      saveDraftToStorage(hydrated, 1, '', user);
      return hydrated;
    }

    // 3. Default fresh state for this host
    return {
      ...DEFAULT_HOST_FORM_DATA,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      facilities: [],
      amenities: [],
      rules: [],
      rooms: [],
      roomRates: [],
    };
  });

  const loadedEmailRef = useRef('');

  // Restore heavy photos from IndexedDB strictly scoped to this host
  useEffect(() => {
    let isMounted = true;
    const userKey = (user?.email || user?._id || 'guest');
    loadImagesFromIndexedDB(userKey).then((idbImages) => {
      if (isMounted && Array.isArray(idbImages) && idbImages.length > 0) {
        setFormData((prev) => {
          if (Array.isArray(prev.images) && prev.images.length > 0) return prev;
          return {
            ...prev,
            images: idbImages,
            image: prev.image || idbImages[0] || '',
          };
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user?.email, user?._id]);

  // Pre-hydrate host UPI account settings if available on backend
  useEffect(() => {
    let isMounted = true;
    paymentsAPI
      .getHostPaymentSettings()
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res?.upiSettings) {
          setFormData((prev) => ({
            ...prev,
            upiId: prev.upiId || res.upiSettings.upiId || '',
            payeeName: prev.payeeName || res.upiSettings.payeeName || prev.propertyName || prev.name || user?.name || '',
          }));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user?.email, user?._id]);

  // Synchronously auto-save draft whenever user enters any details or advances steps
  useEffect(() => {
    saveDraftToStorage(formData, activeStep, googleMapsUrl, user);
  }, [formData, activeStep, googleMapsUrl, user]);

  // Real-time socket sync for host approval/rejection state
  useEffect(() => {
    const socket = getSocket();
    const handleHostApproved = () => {
      setHasUploadedProperty(true);
      setFormData((prev) => ({ ...prev, status: 'Approved', isApproved: true }));
    };
    const handleHostStatus = (payload) => {
      if (payload?.status) {
        setFormData((prev) => ({
          ...prev,
          status: payload.status,
          isApproved: payload.status === 'Approved',
        }));
      }
    };
    socket.on('host:approved', handleHostApproved);
    socket.on('host:status_updated', handleHostStatus);
    socket.on('host:rejected', handleHostStatus);
    return () => {
      socket.off('host:approved', handleHostApproved);
      socket.off('host:status_updated', handleHostStatus);
      socket.off('host:rejected', handleHostStatus);
    };
  }, []);

  // Smoothly scroll to top when user changes tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  // Window unload listener to flush draft and prevent accidental loss on refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      saveDraftToStorage(formData, activeStep, googleMapsUrl, user);
      if (Array.isArray(formData.images) && formData.images.length > 0) {
        saveImagesToIndexedDB(formData.images);
      }

      // Prompt confirmation on refresh/tab close if on photos tab or any progress made
      const hasUnsavedWork = Boolean(
        activeStep === 4 ||
        (Array.isArray(formData.images) && formData.images.length > 0) ||
        formData.propertyName?.trim() ||
        formData.roadArea?.trim() ||
        activeStep > 1
      );

      if (hasUnsavedWork) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, activeStep, googleMapsUrl, user]);  // Hydrate user profile defaults if user is loaded and ensure cross-tenant sanitization
  const lastHydratedUserIdRef = useRef(user?.email || '');
  useEffect(() => {
    const currentEmail = (user?.email || '').trim().toLowerCase();
    if (!currentEmail || lastHydratedUserIdRef.current === currentEmail) return;
    lastHydratedUserIdRef.current = currentEmail;

    queueMicrotask(() => {
      setFormData((prev) => {
        const prevEmail = (prev.email || '').trim().toLowerCase();
        if (prevEmail && currentEmail && prevEmail !== currentEmail) {
          return {
            ...DEFAULT_HOST_FORM_DATA,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            facilities: [],
            amenities: [],
            rules: [],
            rooms: [],
            roomRates: [],
          };
        }

        const needsName = !prev.name && user.name;
        const needsEmail = !prev.email && user.email;
        const needsPhone = !prev.phone && user.phone;
        if (needsName || needsEmail || needsPhone) {
          return {
            ...prev,
            name: prev.name || user.name || '',
            email: prev.email || user.email || '',
            phone: prev.phone || user.phone || '',
          };
        }
        return prev;
      });
    });
  }, [user]);

  // Load existing property details if already registered (strictly scoped to this host)
  useEffect(() => {
    let isMounted = true;
    async function loadExisting() {
      const targetEmail = (user?.email || '').trim().toLowerCase();
      if (!targetEmail || loadedEmailRef.current === targetEmail) return;

      try {
        const targetId = (user?._id || '').toString();

        const [hostRes, staysRes] = await Promise.all([
          adminAPI.getHostByEmail(targetEmail).catch(() => null),
          staysAPI.getHostProperties().catch(() => []),
        ]);

        if (!isMounted) return;

        // STRICT MULTI-TENANT FILTER: Stays must strictly match targetEmail or user._id
        const matchingStays = (Array.isArray(staysRes) ? staysRes : []).filter((s) => {
          const stayEmail = (s.email || s.hostEmail || '').trim().toLowerCase();
          const stayHostId = (s.hostId?._id || s.hostId || '').toString();
          if (stayEmail && targetEmail && stayEmail === targetEmail) return true;
          if (stayHostId && targetId && stayHostId === targetId) return true;
          return false;
        });

        const stayProp = matchingStays.length > 0 ? matchingStays[0] : null;

        // Check if host profile has a verified stay belonging to this host
        const hostHasStay = Boolean(
          hostRes?.hasProperty && (hostRes?.stay || hostRes?.host)
        );

        let prop = null;
        if (stayProp) {
          prop = {
            ...(hostRes?.host || {}),
            ...(hostRes?.stay || {}),
            ...stayProp,
            propertyName: stayProp.propertyName || stayProp.title || hostRes?.host?.propertyName || hostRes?.stay?.title || '',
            title: stayProp.title || stayProp.propertyName || hostRes?.stay?.title || hostRes?.host?.propertyName || '',
            roomRates: (Array.isArray(stayProp.roomRates) && stayProp.roomRates.length > 0)
              ? stayProp.roomRates
              : (hostRes?.stay?.roomRates || hostRes?.host?.roomRates || []),
            rooms: (Array.isArray(stayProp.rooms) && stayProp.rooms.length > 0)
              ? stayProp.rooms
              : (hostRes?.stay?.rooms || hostRes?.host?.rooms || []),
          };
        } else if (hostHasStay) {
          const hStay = hostRes.stay || {};
          const hHost = hostRes.host || {};
          prop = {
            ...hStay,
            ...hHost,
            propertyName: hHost.propertyName || hStay.title || hStay.propertyName || '',
            title: hStay.title || hHost.propertyName || '',
            roomRates: hStay.roomRates || hHost.roomRates || [],
            rooms: hStay.rooms || hHost.rooms || [],
          };
        }

        if (prop && (prop.propertyName || prop.title || (Array.isArray(prop.rooms) && prop.rooms.length > 0))) {
          loadedEmailRef.current = targetEmail;
          setIsEditing(true);
          setHasUploadedProperty(true);

          const { rates: loadedRates, rooms: loadedRooms } = reconcileRoomsWithRates(
            prop.rooms,
            prop.roomRates
          );

          const rawExistingImages = Array.isArray(prop.images) && prop.images.length > 0
            ? prop.images
            : (prop.image ? [prop.image] : []);
          const cleanExistingImages = rawExistingImages
            .map((img) => {
              const str = String(img || '').trim();
              if (!str.startsWith('http') && !str.startsWith('data:') && str.startsWith('image/')) {
                return `data:${str}`;
              }
              return str;
            })
            .filter(Boolean)
            .slice(0, MAX_PHOTOS);

          setFormData((prev) => {
            const currentDraft = loadDraftFromStorage(user);
            const draftFormData = currentDraft?.formData || {};

            const mergedRules = (Array.isArray(prop.rules) && prop.rules.length > 0)
              ? prop.rules
              : (Array.isArray(prev.rules) && prev.rules.length > 0
                ? prev.rules
                : (Array.isArray(draftFormData.rules) ? draftFormData.rules : []));

            const mergedFacilities = (Array.isArray(prop.facilities) && prop.facilities.length > 0)
              ? prop.facilities
              : (Array.isArray(prop.amenities) && prop.amenities.length > 0
                ? prop.amenities
                : (Array.isArray(prev.facilities) && prev.facilities.length > 0
                  ? prev.facilities
                  : (Array.isArray(draftFormData.facilities) ? draftFormData.facilities : [])));

            const mergedImages = cleanExistingImages.length > 0
              ? cleanExistingImages
              : ((Array.isArray(prev.images) && prev.images.length > 0) ? prev.images : []);

            const mergedRooms = loadedRooms.length > 0
              ? loadedRooms
              : ((Array.isArray(prev.rooms) && prev.rooms.length > 0) ? prev.rooms : []);

            const mergedRates = loadedRates.length > 0
              ? loadedRates
              : ((Array.isArray(prev.roomRates) && prev.roomRates.length > 0) ? prev.roomRates : []);

            const updated = {
              ...prev,
              name: prop.name || user?.name || prev.name || '',
              email: prop.email || user?.email || prev.email || '',
              phone: prop.phone || user?.phone || prev.phone || '',
              propertyName: prop.propertyName || prop.title || prev.propertyName || '',
              propertyType: prop.propertyType || prop.type || prev.propertyType || 'PG',
              genderType: prop.genderType || prev.genderType || 'Both',
              price: prop.price ? String(prop.price).replace(/[^0-9]/g, '') : (mergedRates[0]?.price ? String(mergedRates[0].price).replace(/[^0-9]/g, '') : (prev.price || '')),
              rateUnit: prop.rateUnit || mergedRates[0]?.rateUnit || prev.rateUnit || '/month',
              roadArea: prop.roadArea || prev.roadArea || '',
              pincode: prop.pincode || prev.pincode || '',
              city: prop.city || prev.city || '',
              state: prop.state || prev.state || '',
              latitude: Number(prop.latitude) || ((prev.latitude && prev.latitude !== 29.3919) ? prev.latitude : 29.3919),
              longitude: Number(prop.longitude) || ((prev.longitude && prev.longitude !== 79.4542) ? prev.longitude : 79.4542),
              totalRooms: (mergedRooms && mergedRooms.length > 0) ? mergedRooms.length : (prop.totalRooms || loadedRooms.length || 0),
              availableRooms: (mergedRooms && mergedRooms.length > 0) ? mergedRooms.filter((r) => r.status === 'Available').length : (prop.availableRooms !== undefined ? prop.availableRooms : loadedRooms.filter((r) => r.status === 'Available').length),
              rating: Number(prop.rating) || prev.rating || 5.0,
              image: mergedImages[0] || prop.image || prev.image || '',
              images: mergedImages,
              instagramVideoUrl: prop.instagramVideoUrl || prev.instagramVideoUrl || '',
              description: prop.description || prev.description || '',
              facilities: mergedFacilities,
              amenities: mergedFacilities,
              rules: mergedRules,
              roomRates: mergedRates,
              rooms: mergedRooms,
              status: prop.status || prev.status || 'Pending Approval',
            };

            const preservedStep = (currentDraft?.activeStep && Number(currentDraft.activeStep) >= 1)
              ? Number(currentDraft.activeStep)
              : activeStep;
            saveDraftToStorage(updated, preservedStep, googleMapsUrl, user);
            return updated;
          });
        } else if (hostRes && hostRes.hasProperty === false) {
          // THIS HOST HAS CONFIRMED NO REGISTERED PROPERTY YET
          loadedEmailRef.current = targetEmail;
          setIsEditing(false);
          setHasUploadedProperty(false);
          const currentDraft = loadDraftFromStorage(user);
          if (!currentDraft) {
            setActiveStep(1);
            setFormData((prev) => {
              const prevEmail = (prev.email || '').trim().toLowerCase();
              if ((prevEmail && prevEmail !== targetEmail) || prev._id || prev.id || prev.propertyName) {
                return {
                  ...DEFAULT_HOST_FORM_DATA,
                  name: user?.name || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                  facilities: [],
                  amenities: [],
                  rules: [],
                  rooms: [],
                  roomRates: [],
                };
              }
              return {
                ...prev,
                name: user?.name || prev.name || '',
                email: user?.email || prev.email || '',
                phone: user?.phone || prev.phone || '',
              };
            });
          }
        } else {
          // API request may have suffered cold-start or temporary network failure:
          // Do not permanently lock loadedEmailRef so retry can succeed
          setTimeout(() => {
            if (isMounted && loadedEmailRef.current !== targetEmail) {
              loadExisting();
            }
          }, 3000);
        }
      } catch (err) {
        console.warn('Could not prefill host:', err);
        // On error, allow retry
        setTimeout(() => {
          if (isMounted && loadedEmailRef.current !== targetEmail) {
            loadExisting();
          }
        }, 3000);
      }
    }
    loadExisting();
    return () => {
      isMounted = false;
    };
  }, [user?.email, user?._id, user?.hasProperty, location.state, navigate]);

  const showToast = (msg, type = 'info') => {
    if (!msg) return;
    if (type === 'error') {
      toast.error(msg);
    } else if (type === 'warn') {
      toast.warn(msg);
    } else if (type === 'success' || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('⭐')) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  };

  const {
    isImportingGMap,
    handleMapLocationChange,
    handleAddressDetected,
    handleImportGoogleMaps,
  } = useHostLocationImport({
    formData,
    setFormData,
    googleMapsUrl,
    showToast,
  });

  const {
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
  } = useHostPhotoUpload({
    formData,
    setFormData,
    showToast,
  });

  const {
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
  } = useHostPerksRules({
    formData,
    setFormData,
    activeStep,
    googleMapsUrl,
    user,
    showToast,
  });

  const {
    selectedCategoryIndex,
    setSelectedCategoryIndex,
    selectedRoomCardId,
    setSelectedRoomCardId,
    selectedRoomNumber,
    setSelectedRoomNumber,
    collapsedCategories,
    setCollapsedCategories,
    handleAddNewCategory,
    handleRemoveCategory,
    handleUpdateCategory,
    handleAddRoomCard,
    handleRemoveRoomCard,
    handleUpdateRoomNumber,
    handleUpdateRoomCapacity,
    toggleCollapseCategory,
  } = useHostRoomForm({
    formData,
    setFormData,
    showToast,
  });

  const validateStep = (stepNumber, shouldSetErrors = true) => {
    return validateHostStep(stepNumber, formData, setFieldErrors, shouldSetErrors);
  };

  const canAccessStep = (targetStepId) => {
    return canAccessHostStep(targetStepId, formData);
  };

  const handleNextStep = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setFieldErrors({});

    // If on Step 3 and host typed a facility or rule without explicitly clicking + Add, auto-commit it
    if (activeStep === 3) {
      let updatedFacilities = [...(formData.facilities || formData.amenities || [])];
      let updatedRules = [...(formData.rules || [])];
      let hasChanges = false;

      const cleanFac = newFacilityInput.trim();
      if (cleanFac && !updatedFacilities.some((f) => f.toLowerCase() === cleanFac.toLowerCase())) {
        updatedFacilities.push(cleanFac);
        setNewFacilityInput('');
        hasChanges = true;
      }

      const cleanRule = newRuleInput.trim();
      if (cleanRule && !updatedRules.some((r) => r.toLowerCase() === cleanRule.toLowerCase())) {
        updatedRules.push(cleanRule);
        setNewRuleInput('');
        hasChanges = true;
      }

      if (hasChanges) {
        const nextData = {
          ...formData,
          facilities: updatedFacilities,
          amenities: updatedFacilities,
          rules: updatedRules,
        };
        setFormData(nextData);
        saveDraftToStorage(nextData, activeStep, googleMapsUrl, user);
      }
    }

    const isValid = validateStep(activeStep, true);
    if (!isValid) return;

    if (activeStep === 5 && !formData.payeeName) {
      setFormData((prev) => ({
        ...prev,
        payeeName: prev.payeeName || prev.propertyName || prev.name || user?.name || '',
      }));
    }

    if (activeStep < WIZARD_STEPS.length) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectStep = (targetStepId) => {
    if (targetStepId === activeStep) return;

    // Moving backward is always allowed to view or edit previous steps
    if (targetStepId < activeStep) {
      setFieldErrors({});
      setActiveStep(targetStepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Moving forward: ensure all steps up to targetStepId - 1 are valid
    for (let s = 1; s < targetStepId; s++) {
      const isValid = validateStep(s, s === activeStep);
      if (!isValid) {
        if (s !== activeStep) {
          setActiveStep(s);
          validateStep(s, true);
        }
        const stepMeta = WIZARD_STEPS.find((st) => st.id === s);
        toast.error(`Complete ${stepMeta?.shortTitle || `Step ${s}`} first`);
        return;
      }
    }

    setFieldErrors({});
    setActiveStep(targetStepId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // Submit Host Property Upload Request
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    // 1. Explicit check for Host details first (Host Name & Valid 10-digit Phone)
    const cleanHostPhone = (formData.phone || '').trim().replace(/\D/g, '');
    const raw10Phone = cleanHostPhone.length === 12 && cleanHostPhone.startsWith('91') ? cleanHostPhone.slice(2) : cleanHostPhone;
    const hasHostName = Boolean(formData.name && formData.name.trim().length >= 2);
    const hasHostPhone = Boolean(raw10Phone && raw10Phone.length >= 10);

    if (!hasHostName || !hasHostPhone) {
      setActiveStep(1);
      setFieldErrors((prev) => ({
        ...prev,
        ...(!hasHostName ? { name: 'Host name is required (min 2 characters).' } : {}),
        ...(!hasHostPhone ? { phone: 'Host contact number must be at least 10 digits.' } : {}),
      }));
      showToast('Fill host details first', 'error');
      return;
    }

    // Verify all steps are completely filled before submitting
    for (let s = 1; s <= WIZARD_STEPS.length; s++) {
      if (!validateStep(s, true)) {
        setActiveStep(s);
        const stepMeta = WIZARD_STEPS.find((st) => st.id === s);
        toast.error(`Complete ${stepMeta?.shortTitle || `Step ${s}`} first`);
        return;
      }
    }

    const formattedLocation = `${formData.city.trim()}, ${formData.state.trim()}`;
    const fullAddress = `${formData.roadArea.trim()}, ${formData.city.trim()}, ${formData.state.trim()} - ${formData.pincode.trim()}`;

    const parsedTotalRooms = Array.isArray(formData.rooms) && formData.rooms.length > 0
      ? formData.rooms.length
      : (Number(formData.totalRooms) || 0);
    const parsedAvailableRooms = Array.isArray(formData.rooms) && formData.rooms.length > 0
      ? formData.rooms.filter((r) => r.status === 'Available').length
      : (Number(formData.availableRooms) || 0);

    const formattedHostPhone = raw10Phone ? `+91 ${raw10Phone}` : formData.phone;

    const result = hostPropertySchema.safeParse({
      ...formData,
      name: formData.name.trim(),
      email: (formData.email || user?.email || '').trim().toLowerCase(),
      phone: formattedHostPhone,
      totalRooms: parsedTotalRooms,
      availableRooms: parsedAvailableRooms,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
    });

    if (!result.success) {
      const errors = {};
      let hasHostDetailError = false;
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0]] = issue.message;
          if (issue.path[0] === 'phone' || issue.path[0] === 'name') {
            hasHostDetailError = true;
          }
        }
      });
      setFieldErrors(errors);
      if (hasHostDetailError) {
        setActiveStep(1);
        showToast('Please fill Host details first (Contact phone number is required).', 'error');
      } else {
        showToast(result.error.issues[0]?.message || 'Please correct the highlighted fields.');
      }
      return;
    }

    const validRates = (formData.roomRates || [])
      .map((r, i) => ({
        _id: r._id || `rate_${Date.now()}_${i}`,
        type: (r.type || '').trim(),
        price: (r.price || '').trim(),
        rateUnit: r.rateUnit || '/month',
        capacity: Number(r.capacity) || 1,
        photos: Array.isArray(r.photos) ? r.photos : [],
        images: Array.isArray(r.images) ? r.images : [],
      }))
      .filter((r) => r.type !== '');

    const validRooms = (formData.rooms || [])
      .map((rm) => ({
        ...rm,
        roomNumber: (rm.roomNumber || '').trim(),
      }))
      .filter((rm) => rm.roomNumber !== '');

    const finalTotalRooms = validRooms.length > 0 ? validRooms.length : (Number(formData.totalRooms) || 0);
    const finalAvailableRooms = validRooms.length > 0
      ? validRooms.filter((r) => r.status === 'Available').length
      : (Number(formData.availableRooms) || 0);

    const primaryPrice = validRates[0]?.price ? String(validRates[0].price).replace(/[^0-9]/g, '') : formData.price;
    const primaryUnit = validRates[0]?.rateUnit || formData.rateUnit || '/month';

    const finalImages = (formData.images || [])
      .map((img) => {
        const str = String(img || '').trim();
        if (!str.startsWith('http') && !str.startsWith('data:') && str.startsWith('image/')) {
          return `data:${str}`;
        }
        return str;
      })
      .filter(Boolean)
      .slice(0, MAX_PHOTOS);
    const finalPrimaryImage = finalImages[0] || '';

    const isAlreadyApproved = formData.status === 'Approved';
    const targetStatus = isAlreadyApproved ? 'Approved' : 'Pending Approval';

    try {
      setIsSubmitting(true);
      setShowProgressModal(true);
      setIsUploadComplete(false);
      setUploadError(null);

      // Persist host UPI settings via dedicated payment settings endpoint
      if (formData.upiId && formData.payeeName) {
        try {
          await paymentsAPI.updateHostPaymentSettings({
            upiId: formData.upiId.trim(),
            payeeName: formData.payeeName.trim(),
          });
        } catch (upiErr) {
          console.warn('Could not update host payment settings via paymentsAPI:', upiErr);
        }
      }

      const res = await adminAPI.createHost({
        ...formData,
        name: formData.name.trim(),
        email: (formData.email || user?.email || '').trim().toLowerCase(),
        phone: formattedHostPhone,
        upiId: (formData.upiId || '').trim(),
        payeeName: (formData.payeeName || '').trim(),
        upiSettings: {
          upiId: (formData.upiId || '').trim(),
          payeeName: (formData.payeeName || '').trim(),
          isConfigured: true,
        },
        facilities: (formData.facilities?.length > 0 ? formData.facilities : formData.amenities) || [],
        amenities: (formData.facilities?.length > 0 ? formData.facilities : formData.amenities) || [],
        rules: formData.rules || [],
        description: formData.description?.trim() || '',
        price: String(primaryPrice || '').trim(),
        rateUnit: primaryUnit,
        roomRates: validRates,
        rooms: validRooms,
        location: formattedLocation,
        address: fullAddress,
        totalRooms: finalTotalRooms,
        availableRooms: finalAvailableRooms,
        image: finalPrimaryImage,
        images: finalImages,
        status: targetStatus,
        isApproved: isAlreadyApproved,
      });

      if (res?.success) {
        try {
          window.dispatchEvent(new CustomEvent('stayhub_rooms_updated'));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('stayhub_live_channel');
            bc.postMessage({ type: 'STAY_UPDATED', stayId: res?.host?._id });
            bc.close();
          }
        } catch {
          /* ignore */
        }

        // Clear local draft from storage upon successful submission
        try {
          clearDraftFromStorage(user);
        } catch {
          /* ignore */
        }

        setIsEditing(true);
        setHasUploadedProperty(true);
        if (user && updateUserSession) {
          updateUserSession({
            ...user,
            role: 'host',
            hasProperty: true,
            phone: formattedHostPhone || user.phone,
          });
        }
        // Signal the showcase progress modal that backend upload succeeded
        setPendingNavigateHost(res.host || formData);
        setIsUploadComplete(true);
      } else {
        const errMsg = res?.message || 'Error submitting property request.';
        setUploadError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err) {
      console.error('Error submitting host upload request:', err);
      const errMsg = err?.message || 'Submission error occurred.';
      setUploadError(errMsg);
      showToast(`Submission error: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadModalComplete = () => {
    setShowProgressModal(false);
    showToast('Property Saved');
    navigate('/host/dashboard', { state: { updatedHost: pendingNavigateHost || formData } });
  };

  const handleCloseProgressModal = () => {
    setShowProgressModal(false);
    setUploadError(null);
    setIsSubmitting(false);
  };

  // Allow a logged-in guest to become a host; backend converts the account role on submit.
  // (No hard block here — the upload flow handles the conversion.)

  const currentStepConfig = WIZARD_STEPS.find((s) => s.id === activeStep) || WIZARD_STEPS[0];
  

  return (
    <div className="bg-[#ebedf0] text-slate-800 host-page-scope font-body-md antialiased min-h-screen flex flex-col justify-between relative selection:bg-[#006C4A] selection:text-white transition-colors duration-300">

      {/* ── Top Header Navigation Bar (Floating Liquid Glass Islands matching Host Dashboard / Pic 2) ── */}
      <header className="relative w-full h-[70px] sm:h-[88px] pointer-events-none select-none z-50 font-body-md antialiased">
        {/* ── 1. LEFT FLOATING ISLAND: CIRCULAR BACK BUTTON ── */}
        {hasUploadedProperty && (
          <Left
            showBadge={false}
            onBack={() => {
              saveDraftToStorage(formData, activeStep, googleMapsUrl, user);
              navigate('/host/dashboard');
            }}
            fallbackUrl="/host/dashboard"
          />
        )}

        {/* ── 2. CENTER FLOATING ISLAND: NAVIGATION TABS (DESKTOP) & STEP COUNTER (MOBILE) ── */}
        <div className="hidden md:flex fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none h-[54px] sm:h-[56px]">
          <HostUploadTabs
            steps={WIZARD_STEPS}
            activeStep={activeStep}
            onSelectStep={handleSelectStep}
            isStepCompleted={(stepId) => validateStep(stepId, false)}
            canAccessStep={canAccessStep}
          />
        </div>

        {/* Mobile Center Step Count Badge (Tappable to open step drawer) */}
        <div className="md:hidden fixed top-2.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none h-[54px] sm:h-[56px] flex items-center justify-center">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-xs text-slate-800 text-xs sm:text-sm font-extrabold tracking-wider uppercase leading-none flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            title="Open Steps Navigation"
            aria-label="Open Steps Navigation"
          >
            <span>Step {activeStep} of {WIZARD_STEPS.length}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 stroke-[2.5]" />
          </button>
        </div>

        {/* ── 3. RIGHT FLOATING ISLAND: USER DASHBOARD BUTTON + PROFILE BUTTON ── */}
        <div className="fixed top-2.5 sm:top-5 right-2.5 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5 pointer-events-auto select-none h-[54px] sm:h-[56px]">
          <button
            type="button"
            onClick={() => navigate('/')}
            data-no-hover="true"
            className="w-[54px] h-[54px] sm:w-[56px] sm:h-[56px] min-w-[54px] min-h-[54px] rounded-full bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:bg-[#f7f4ee] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title="Switch to User Dashboard"
            aria-label="User Dashboard"
          >
            <svg
              className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-slate-700 stroke-[2.2] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <div className="relative flex items-center justify-center h-[54px] sm:h-[56px] shrink-0">
            <Login />
          </div>
        </div>
      </header>

      {/* ── Left Side Upload Steps Panel (Styled matching LeftPropertiesPanel) ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              key="step-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 bg-[#121418]/60 backdrop-blur-xs cursor-pointer"
              onClick={() => setMobileNavOpen(false)}
            />

            {/* Floating Panel positioned at top-left with height fitting steps list */}
            <div className="fixed top-2.5 sm:top-5 left-2.5 sm:left-6 pointer-events-none z-10 max-w-[calc(100vw-20px)]">
              <motion.div
                key="step-nav-drawer-panel"
                initial={{ opacity: 0, x: -28, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -28, scale: 0.98 }}
                transition={{
                  duration: 0.28,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="pointer-events-auto w-80 sm:w-88 max-w-[calc(100vw-24px)] flex flex-col bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.22)] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-40px)] will-change-transform select-none rounded-[28px] sm:rounded-[32px] overflow-hidden"
              >
                {/* Header: Centered Upload Steps title */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 shrink-0">
                  <div className="w-7" />
                  <h2 className="text-lg sm:text-xl font-bold text-[#1f1b16] tracking-tight leading-none text-center">
                    Upload Steps
                  </h2>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close steps menu"
                  >
                    <X className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                {/* Minimal Step Rows */}
                <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
                  {WIZARD_STEPS.map((step) => {
                    const isActive = step.id === activeStep;
                    const isCompleted = validateStep(step.id, false);
                    const isAccessible = canAccessStep(step.id);

                    return (
                      <button
                        key={step.id}
                        type="button"
                        disabled={!isAccessible && !isActive}
                        onClick={() => {
                          if (isAccessible || isActive) {
                            handleSelectStep(step.id);
                            setMobileNavOpen(false);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all duration-150 ${
                          isActive
                            ? 'border-[#1f1b16] bg-[#1f1b16] text-white shadow-sm cursor-pointer'
                            : isAccessible
                            ? 'border-slate-200/80 bg-white hover:bg-slate-50 text-[#1f1b16] cursor-pointer active:scale-[0.99]'
                            : 'border-slate-200/50 bg-slate-50/50 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                            isActive
                              ? 'bg-white text-[#1f1b16]'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted && !isActive ? (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <span>{step.id}</span>
                          )}
                        </div>

                        <span className="flex-1 text-sm font-semibold tracking-tight truncate">
                          {step.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Fixed Step Editorial Header (Airbnb-style bold & calm typography with smooth tab transition) ── */}
      <section className="w-full shrink-0 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-1 pb-3 sm:pb-4 md:pb-1.5 select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-heading-${activeStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center space-y-1 sm:space-y-2 md:space-y-0.5"
          >
            {/* Main Step Headline - Large & Balanced for Mobile */}
            <h1 className="text-[26px] sm:text-3xl md:text-xl font-black text-slate-900 tracking-tight">
              {currentStepConfig.sub || currentStepConfig.title}
            </h1>

            {/* Step Subtitle / Description - Easy to Read on Mobile */}
            {/* Step Subtitle / Description - Kept on Mobile, Hidden on Desktop */}
            <p className="md:hidden text-[14px] sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
              {currentStepConfig.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Main Viewport-Fitted Canvas (Natural Smooth Scroll, Generous Bottom Padding) ── */}
      <main
        className="flex-1 w-full relative z-10 max-md:rounded-t-[2.5rem] sm:max-md:rounded-t-[3rem] max-md:bg-[#f4f6f9] max-md:border-t max-md:border-slate-200/80 max-md:shadow-[0_-12px_36px_rgba(0,0,0,0.06)] max-md:px-4 max-md:py-6 max-md:pb-32 md:max-w-6xl md:mx-auto md:px-4 md:sm:px-6 md:lg:px-8 md:py-1 md:pb-36"
      >
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            {activeStep === 1 && (
              <UploadBasicsTab
                formData={formData}
                setFormData={setFormData}
                fieldErrors={fieldErrors}
                setFieldErrors={setFieldErrors}
              />
            )}

            {activeStep === 2 && (
              <UploadLocationTab
                formData={formData}
                setFormData={setFormData}
                fieldErrors={fieldErrors}
                onMapLocationChange={handleMapLocationChange}
                onAddressDetected={handleAddressDetected}
                googleMapsUrl={googleMapsUrl}
                setGoogleMapsUrl={setGoogleMapsUrl}
                handleImportGoogleMaps={handleImportGoogleMaps}
                isImportingGMap={isImportingGMap}
              />
            )}

            {activeStep === 3 && (
              <UploadPerksRulesTab
                formData={formData}
                setFormData={setFormData}
                newFacilityInput={newFacilityInput}
                setNewFacilityInput={setNewFacilityInput}
                onAddFacility={handleAddFacility}
                onRemoveFacility={handleRemoveFacility}
                onUpdateFacility={handleUpdateFacility}
                newRuleInput={newRuleInput}
                setNewRuleInput={setNewRuleInput}
                onAddRule={handleAddRule}
                onRemoveRule={handleRemoveRule}
                onUpdateRule={handleUpdateRule}
              />
            )}

            {activeStep === 4 && (
              <UploadPhotosTab
                formData={formData}
                setFormData={setFormData}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                onRemovePhoto={handleRemovePhoto}
                onSetCoverPhoto={handleSetCoverPhoto}
                onReplacePhoto={handleReplacePhoto}
                onSlotUpload={handleSlotUpload}
                draggedPhotoIndex={draggedPhotoIndex}
                dragOverIndex={dragOverIndex}
                onPhotoDragStart={handlePhotoDragStart}
                onPhotoDragOver={handlePhotoDragOver}
                onPhotoDragLeave={handlePhotoDragLeave}
                onPhotoDrop={handlePhotoDrop}
                maxPhotos={MAX_PHOTOS}
              />
            )}

            {activeStep === 5 && (
              <div className="max-w-6xl mx-auto">
                <UploadRoomsPricingTab
                  formData={formData}
                  setFormData={setFormData}
                  fieldErrors={fieldErrors}
                  maxDescriptionChars={MAX_DESCRIPTION_CHARS}
                  selectedCategoryIndex={selectedCategoryIndex}
                  onSelectCategoryIndex={setSelectedCategoryIndex}
                  onAddCategory={handleAddNewCategory}
                  onRemoveCategory={handleRemoveCategory}
                  onUpdateCategory={handleUpdateCategory}
                  collapsedCategories={collapsedCategories}
                  onToggleCollapseCategory={toggleCollapseCategory}
                  selectedRoomCardId={selectedRoomCardId}
                  selectedRoomNumber={selectedRoomNumber}
                  onSelectRoomCardId={setSelectedRoomCardId}
                  onAddRoomCard={handleAddRoomCard}
                  onRemoveRoomCard={handleRemoveRoomCard}
                  onUpdateRoomNumber={handleUpdateRoomNumber}
                  onUpdateRoomCapacity={handleUpdateRoomCapacity}
                />
              </div>
            )}

            {activeStep === 6 && (
              <UploadUpiTab
                formData={formData}
                setFormData={setFormData}
                fieldErrors={fieldErrors}
                setFieldErrors={setFieldErrors}
              />
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* ── Fixed Bottom Progression Bar (Airbnb visual reference: screenshots 1 & 2) ── */}
      <footer
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]"
      >
        {/* Hairline Continuous Progress Indicator Line */}
        <div className="w-full h-1 relative overflow-hidden max-md:bg-slate-200/60 md:bg-slate-100">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] rounded-r-full transition-all duration-300 shadow-[0_0_8px_rgba(14,165,233,0.4)]"
            style={{ width: `${(activeStep / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 max-md:h-18 md:h-13.5 flex items-center justify-between">
          {/* Left Action: Back Button or Auto-save Draft Status */}
          <div className="flex items-center">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setActiveStep((prev) => Math.max(1, prev - 1));
                }}
                className="flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-base underline underline-offset-4 cursor-pointer active:scale-95 transition-all max-md:text-sky-900 max-md:hover:text-sky-950 font-semibold md:text-slate-800 md:hover:text-black"
              >
                <ChevronLeft className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm md:text-xs text-slate-500 font-medium pl-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Draft auto-saved securely</span>
                <span className="sm:hidden">Draft saved</span>
              </div>
            )}
          </div>

          {/* Center Info: Step overview badge (Desktop only) */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {currentStepConfig.title}
            </span>
          </div>

          {/* Right Action: Next / Publish Button (Airbnb-inspired high-contrast pill button) */}
          <div className="flex items-center">
            {activeStep < WIZARD_STEPS.length ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[48px] sm:min-h-[52px] px-7 sm:px-8 rounded-full max-md:bg-gradient-to-r max-md:from-[#0ea5e9] max-md:to-[#0284c7] max-md:hover:from-[#0284c7] max-md:hover:to-[#0369a1] max-md:shadow-[0_4px_16px_rgba(14,165,233,0.32)] md:bg-[#006C4A] md:hover:bg-[#005a3e] md:active:bg-[#004d35] text-white font-bold text-sm md:text-xs shadow-sm md:shadow-[#006C4A]/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="min-h-[48px] sm:min-h-[52px] px-7 sm:px-8 rounded-full max-md:bg-gradient-to-r max-md:from-[#0ea5e9] max-md:to-[#0284c7] max-md:hover:from-[#0284c7] max-md:hover:to-[#0369a1] max-md:shadow-[0_4px_16px_rgba(14,165,233,0.32)] md:bg-[#006C4A] md:hover:bg-[#005a3e] md:active:bg-[#004d35] text-white font-bold text-sm md:text-xs shadow-md md:shadow-[#006C4A]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Update Listing</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Request Upload</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* ── Upload & Publish Showcase Progress Modal ── */}
      <UploadProgressModal
        isOpen={showProgressModal}
        isComplete={isUploadComplete}
        error={uploadError}
        onComplete={handleUploadModalComplete}
        onClose={handleCloseProgressModal}
      />
    </div>
  );
}

export default HostUploadPage;
