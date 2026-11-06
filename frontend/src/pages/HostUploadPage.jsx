import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Plus, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, staysAPI } from '../services/api';
import { Login } from '../components/navbar/Login';
import { toast } from '../context/ToastContext';
import { HostUploadTabs } from '../components/host/HostUploadTabs';
import { ThemeTogglePill } from '../components/common/ThemeTogglePill';
import { UploadBasicsTab } from '../components/host/upload/UploadBasicsTab';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { fetchAddressFromCoords, parseGoogleMapsUrl } from '../utils/geoUtils';
import { isRoomMatchingCategory } from '../utils/dateUtils';

import { UploadLocationTab } from '../components/host/upload/UploadLocationTab';
import { UploadPerksRulesTab } from '../components/host/upload/UploadPerksRulesTab';
import { UploadPhotosTab } from '../components/host/upload/UploadPhotosTab';
import { UploadRoomsPricingTab } from '../components/host/upload/UploadRoomsPricingTab';

const MAX_PHOTOS = 5;
const MAX_DESCRIPTION_CHARS = 200;



const WIZARD_STEPS = [
  {
    id: 1,
    key: 'basics',
    title: 'Host & Property Basics',
    shortTitle: 'Basics',
    sub: 'Host details & property identity',
    desc: 'Verify host contact details and configure property identity & categories.',
  },
  {
    id: 2,
    key: 'location',
    title: 'Location & Address',
    shortTitle: 'Location',
    sub: 'Where is your property located?',
    desc: 'Pin your stay on the map or paste a Google Maps link to auto-fill details.',
  },
  {
    id: 3,
    key: 'amenities',
    title: 'Facilities & Rules',
    shortTitle: 'Perks & Rules',
    sub: 'What does your place offer?',
    desc: 'Select facilities available for residents and establish clear house guidelines.',
  },
  {
    id: 4,
    key: 'photos',
    title: 'Photos & Video Tour',
    shortTitle: 'Photos',
    sub: 'Showcase your property',
    desc: 'Upload up to 5 photos and add an Instagram Reel or YouTube walkthrough tour link.',
  },
  {
    id: 5,
    key: 'rooms',
    title: 'Rooms, Pricing & Review',
    shortTitle: 'Rooms & Pricing',
    sub: 'Room categories & pricing',
    desc: 'Configure your room rates and room cards, then review before publishing live.',
  },
];

const hostPropertySchema = z.object({
  name: z.string().trim().min(2, 'Please fill Host name first (at least 2 characters)'),
  email: z.string().trim().email('Please enter a valid host email address'),
  phone: z.string().trim().min(10, 'Please fill Host details first (Contact number must be at least 10 digits)'),
  propertyName: z.string().trim().min(3, 'Property name must be at least 3 characters'),
  propertyType: z.enum(['PG', 'Hotel', 'Flat']),
  genderType: z.enum(['Boys', 'Girls', 'Both', 'Family', 'Male', 'Female']),
  roadArea: z.string().trim().min(2, 'Road name / area / colony is required'),
  pincode: z.string().trim().min(4, 'Valid pincode is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  price: z.string().optional(),
  rateUnit: z.string().optional(),
  totalRooms: z.number().min(0, 'Total rooms cannot be negative').optional(),
  availableRooms: z.number().min(0, 'Available rooms cannot be negative').optional(),
  rooms: z.array(z.any()).optional(),
  instagramVideoUrl: z.string().optional(),
  description: z.string().trim()
    .min(10, 'Property description must be at least 10 characters')
    .max(MAX_DESCRIPTION_CHARS, `Property description cannot exceed ${MAX_DESCRIPTION_CHARS} characters`),
}).passthrough();

const DEFAULT_HOST_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  propertyName: '',
  propertyType: 'PG',
  genderType: 'Both',
  price: '',
  rateUnit: '/month',
  roadArea: '',
  pincode: '',
  city: '',
  state: '',
  latitude: 29.3919,
  longitude: 79.4542,
  totalRooms: 0,
  availableRooms: 0,
  rating: 5.0,
  image: '',
  images: [],
  instagramVideoUrl: '',
  description: '',
  facilities: [],
  amenities: [],
  rules: [],
  roomRates: [],
  rooms: [],
  status: 'Pending Approval',
  isApproved: false,
};

const CANONICAL_DRAFT_KEY = 'roomscout_host_upload_draft';

const getDraftStorageKeys = (user) => {
  const keys = [CANONICAL_DRAFT_KEY];
  if (user?._id) keys.push(`roomscout_upload_draft_${user._id}`);
  if (user?.email) keys.push(`roomscout_upload_draft_${user.email}`);
  keys.push('roomscout_upload_draft_guest');
  return keys;
};

const saveDraftToStorage = (formData, activeStep, googleMapsUrl, user) => {
  if (!formData || typeof formData !== 'object') return;
  try {
    const hasAnyContent = Boolean(
      (formData.propertyName && formData.propertyName.trim()) ||
      (formData.phone && formData.phone.trim()) ||
      (formData.name && formData.name.trim()) ||
      (formData.roadArea && formData.roadArea.trim()) ||
      (formData.city && formData.city.trim()) ||
      (formData.pincode && formData.pincode.trim()) ||
      (formData.description && formData.description.trim()) ||
      (formData.propertyType && formData.propertyType !== 'PG') ||
      (formData.genderType && formData.genderType !== 'Both') ||
      (formData.price && String(formData.price).trim()) ||
      (formData.instagramVideoUrl && formData.instagramVideoUrl.trim()) ||
      (formData.images && formData.images.length > 0) ||
      (formData.rooms && formData.rooms.length > 0) ||
      (formData.roomRates && formData.roomRates.length > 0) ||
      (formData.facilities && formData.facilities.length > 0) ||
      (formData.amenities && formData.amenities.length > 0) ||
      (formData.rules && formData.rules.length > 0) ||
      googleMapsUrl ||
      activeStep > 1
    );

    if (!hasAnyContent) return;

    const payload = JSON.stringify({
      formData,
      activeStep,
      googleMapsUrl,
      userEmail: user?.email || '',
      userId: user?._id || '',
      updatedAt: Date.now(),
    });

    localStorage.setItem(CANONICAL_DRAFT_KEY, payload);
    if (user?._id) localStorage.setItem(`roomscout_upload_draft_${user._id}`, payload);
    if (user?.email) localStorage.setItem(`roomscout_upload_draft_${user.email}`, payload);
  } catch (storageErr) {
    if (storageErr && (storageErr.name === 'QuotaExceededError' || storageErr.code === 22)) {
      try {
        const safeData = {
          ...formData,
          images: (formData.images || []).filter((img) => typeof img === 'string' && img.startsWith('http')),
          image: typeof formData.image === 'string' && formData.image.startsWith('http') ? formData.image : '',
        };
        const safePayload = JSON.stringify({
          formData: safeData,
          activeStep,
          googleMapsUrl,
          userEmail: user?.email || '',
          userId: user?._id || '',
          updatedAt: Date.now(),
        });
        localStorage.setItem(CANONICAL_DRAFT_KEY, safePayload);
      } catch {
        /* ignore */
      }
    }
  }
};

const clearDraftFromStorage = (user) => {
  try {
    localStorage.removeItem(CANONICAL_DRAFT_KEY);
    if (user?._id) localStorage.removeItem(`roomscout_upload_draft_${user._id}`);
    if (user?.email) localStorage.removeItem(`roomscout_upload_draft_${user.email}`);
    localStorage.removeItem('roomscout_upload_draft_guest');
  } catch {
    /* ignore */
  }
};

const loadDraftFromStorage = (user) => {
  try {
    const candidateKeys = getDraftStorageKeys(user);
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.formData) {
          if (user?.email && parsed.userEmail && parsed.userEmail.toLowerCase() !== user.email.toLowerCase()) {
            continue;
          }
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read upload draft:', err);
  }
  return null;
};

const reconcileRoomsWithRates = (rawRooms, rawRates) => {
  const safeRates = (Array.isArray(rawRates) ? rawRates : [])
    .filter(Boolean)
    .map((r, i) => ({
      ...r,
      _id: r._id ? String(r._id) : (r.id ? String(r.id) : `rate_${Date.now()}_${i}`),
    }));

  const safeRooms = (Array.isArray(rawRooms) ? rawRooms : [])
    .filter(Boolean)
    .map((rm, i) => {
      const roomUid = rm._id ? String(rm._id) : `room_${Date.now()}_${i}`;
      let matchedIdx = safeRates.findIndex((r) => {
        if (rm.rateId && (String(rm.rateId) === String(r._id) || (r.id && String(rm.rateId) === String(r.id)))) return true;
        if (rm.type && r.type && String(rm.type).trim().toLowerCase() === String(r.type).trim().toLowerCase()) return true;
        if (typeof rm.categoryIndex === 'number' && rm.categoryIndex === safeRates.indexOf(r)) return true;
        return false;
      });

      if (matchedIdx === -1 && safeRates.length > 0) {
        matchedIdx = 0;
      }

      const matchedRate = safeRates[matchedIdx];
      return {
        ...rm,
        _id: roomUid,
        rateId: matchedRate ? matchedRate._id : (rm.rateId || `rate_${matchedIdx}`),
        categoryIndex: matchedIdx !== -1 ? matchedIdx : (typeof rm.categoryIndex === 'number' ? rm.categoryIndex : 0),
        type: matchedRate?.type || rm.type || '',
        price: rm.price || (matchedRate?.price ? (String(matchedRate.price).startsWith('₹') ? matchedRate.price : `₹${matchedRate.price}`) : '₹0'),
        rateUnit: rm.rateUnit || matchedRate?.rateUnit || '/month',
        capacity: Number(rm.capacity) || Number(matchedRate?.capacity) || 1,
      };
    });

  return { rates: safeRates, rooms: safeRooms };
};

export function HostUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserSession } = useAuth();

  const fileInputRef = useRef(null);

  // Stepper state (1 to 5) initialized from draft or navigation state
  const [activeStep, setActiveStep] = useState(() => {
    if (location.state?.initialStep && Number(location.state.initialStep) >= 1 && Number(location.state.initialStep) <= 5) {
      return Number(location.state.initialStep);
    }
    // Always start the upload wizard on the first (Basics) step
    return 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Room Categories & Inventory states for Step 5
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initial = {};
    for (let i = 0; i < 20; i++) initial[i] = true;
    return initial;
  });
  const [selectedRoomCardId, setSelectedRoomCardId] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);

  // Custom Facility & Rule Inputs
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');

  // Drag and Drop State for Photos
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Google Maps Import Link State initialized from draft if present
  const [googleMapsUrl, setGoogleMapsUrl] = useState(() => {
    try {
      const draft = loadDraftFromStorage(user);
      return draft?.googleMapsUrl || '';
    } catch {
      return '';
    }
  });
  const [isImportingGMap, setIsImportingGMap] = useState(false);

  // Form State initialized from live dashboard navigation state, draft (persists across reload), or default
  const [formData, setFormData] = useState(() => {
    // 1. If hostProperty was passed from dashboard navigation, use it as priority source of truth
    const passedProp = location.state?.hostProperty;
    if (passedProp && typeof passedProp === 'object') {
      const { rates: loadedRates, rooms: loadedRooms } = reconcileRoomsWithRates(
        passedProp.rooms,
        passedProp.roomRates
      );

      const rawImgs = Array.isArray(passedProp.images) && passedProp.images.length > 0
        ? passedProp.images
        : (passedProp.image ? [passedProp.image] : []);
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
        name: passedProp.name || user?.name || '',
        email: passedProp.email || user?.email || '',
        phone: passedProp.phone || user?.phone || '',
        propertyName: passedProp.propertyName || passedProp.title || '',
        propertyType: passedProp.propertyType || passedProp.type || 'PG',
        genderType: passedProp.genderType || 'Both',
        price: passedProp.price ? String(passedProp.price).replace(/[^0-9]/g, '') : (loadedRates[0]?.price ? String(loadedRates[0].price).replace(/[^0-9]/g, '') : ''),
        rateUnit: passedProp.rateUnit || loadedRates[0]?.rateUnit || '/month',
        roadArea: passedProp.roadArea || '',
        pincode: passedProp.pincode || '',
        city: passedProp.city || '',
        state: passedProp.state || '',
        latitude: Number(passedProp.latitude) || 29.3919,
        longitude: Number(passedProp.longitude) || 79.4542,
        totalRooms: passedProp.totalRooms || loadedRooms.length || 0,
        availableRooms: passedProp.availableRooms !== undefined ? passedProp.availableRooms : loadedRooms.length,
        rating: Number(passedProp.rating) || 5.0,
        image: cleanImgs[0] || passedProp.image || '',
        images: cleanImgs,
        instagramVideoUrl: passedProp.instagramVideoUrl || '',
        description: passedProp.description || passedProp.bio || '',
        facilities: Array.isArray(passedProp.facilities) && passedProp.facilities.length > 0 ? passedProp.facilities : (Array.isArray(passedProp.amenities) ? passedProp.amenities : DEFAULT_HOST_FORM_DATA.facilities),
        amenities: Array.isArray(passedProp.facilities) && passedProp.facilities.length > 0 ? passedProp.facilities : (Array.isArray(passedProp.amenities) ? passedProp.amenities : DEFAULT_HOST_FORM_DATA.amenities),
        rules: Array.isArray(passedProp.rules) && passedProp.rules.length > 0 ? passedProp.rules : [],
        roomRates: loadedRates,
        rooms: loadedRooms,
        status: passedProp.status || 'Pending Approval',
        isApproved: passedProp.status === 'Approved' || Boolean(passedProp.isApproved),
      };

      saveDraftToStorage(hydrated, 1, '', user);
      return hydrated;
    }

    // 2. Prioritize draft from localStorage so refresh NEVER wipes user-entered details
    try {
      const draft = loadDraftFromStorage(user);
      if (draft?.formData && typeof draft.formData === 'object') {
        const merged = {
          ...DEFAULT_HOST_FORM_DATA,
          ...draft.formData,
        };
        if (!merged.name && user?.name) merged.name = user.name;
        if (!merged.email && user?.email) merged.email = user.email;
        if (!merged.phone && user?.phone) merged.phone = user.phone;

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
    } catch (err) {
      console.warn('Could not hydrate draft formData:', err);
    }

    return {
      ...DEFAULT_HOST_FORM_DATA,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    };
  });

  const hasLoadedExistingRef = useRef(false);

  // Synchronously auto-save draft whenever user enters any details or advances steps
  useEffect(() => {
    saveDraftToStorage(formData, activeStep, googleMapsUrl, user);
  }, [formData, activeStep, googleMapsUrl, user]);

  // Window unload listener to flush latest keystrokes before browser refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveDraftToStorage(formData, activeStep, googleMapsUrl, user);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, activeStep, googleMapsUrl, user]);

  // Hydrate user profile defaults if user is loaded and fields are still empty
  useEffect(() => {
    if (user) {
      setFormData((prev) => {
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
    }
  }, [user]);

  // Load existing property details if already registered (loaded once on mount)
  useEffect(() => {
    async function loadExisting() {
      if (!user?.email || hasLoadedExistingRef.current) return;
      hasLoadedExistingRef.current = true;
      try {
        const [hostRes, staysRes] = await Promise.all([
          adminAPI.getHostByEmail(user.email).catch(() => null),
          staysAPI.getHostProperties().catch(() => []),
        ]);

        const stayProp = Array.isArray(staysRes) && staysRes.length > 0 ? staysRes[0] : null;
        let prop = null;
        if (stayProp) {
          prop = {
            ...(hostRes?.host || {}),
            ...(hostRes?.stay || {}),
            ...stayProp,
            roomRates: (Array.isArray(stayProp.roomRates) && stayProp.roomRates.length > 0)
              ? stayProp.roomRates
              : (hostRes?.stay?.roomRates || hostRes?.host?.roomRates || []),
            rooms: (Array.isArray(stayProp.rooms) && stayProp.rooms.length > 0)
              ? stayProp.rooms
              : (hostRes?.stay?.rooms || hostRes?.host?.rooms || []),
          };
        } else if (hostRes?.hasProperty && (hostRes.host || hostRes.stay)) {
          prop = {
            ...(hostRes.stay || {}),
            ...(hostRes.host || {}),
            roomRates: hostRes.stay?.roomRates || hostRes.host?.roomRates || [],
            rooms: hostRes.stay?.rooms || hostRes.host?.rooms || [],
          };
        }

        if (prop) {
          setIsEditing(true);

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
            // Keep only user-manually entered rules and facilities, do not auto-attach from backend prop
            const mergedRules = Array.isArray(prev.rules) ? prev.rules : [];
            const mergedFacilities = Array.isArray(prev.facilities) ? prev.facilities : [];

            const prevImages = (Array.isArray(prev.images) && prev.images.length > 0) ? prev.images : [];
            const mergedImages = prevImages.length > 0 ? prevImages : cleanExistingImages;

            const prevRooms = (Array.isArray(prev.rooms) && prev.rooms.length > 0) ? prev.rooms : [];
            const mergedRooms = prevRooms.length > 0 ? prevRooms : loadedRooms;

            const prevRates = (Array.isArray(prev.roomRates) && prev.roomRates.length > 0) ? prev.roomRates : [];
            const mergedRates = prevRates.length > 0 ? prevRates : loadedRates;

            const updated = {
              ...prev,
              name: prev.name || prop.name || user?.name || '',
              email: prev.email || prop.email || user?.email || '',
              phone: prev.phone || prop.phone || user?.phone || '',
              propertyName: prev.propertyName || prop.propertyName || prop.title || prop.properties?.[0] || '',
              propertyType: prev.propertyType || prop.propertyType || prop.type || 'PG',
              genderType: prev.genderType || prop.genderType || 'Both',
              price: prev.price || (prop.price ? String(prop.price).replace(/[^0-9]/g, '') : (mergedRates[0]?.price ? String(mergedRates[0].price).replace(/[^0-9]/g, '') : '')),
              rateUnit: prev.rateUnit || prop.rateUnit || mergedRates[0]?.rateUnit || '/month',
              roadArea: prev.roadArea || prop.roadArea || '',
              pincode: prev.pincode || prop.pincode || '',
              city: prev.city || prop.city || '',
              state: prev.state || prop.state || '',
              latitude: (prev.latitude && prev.latitude !== 29.3919) ? prev.latitude : (Number(prop.latitude) || 29.3919),
              longitude: (prev.longitude && prev.longitude !== 79.4542) ? prev.longitude : (Number(prop.longitude) || 79.4542),
              totalRooms: (mergedRooms && mergedRooms.length > 0) ? mergedRooms.length : (prop.totalRooms || loadedRooms.length || prev.totalRooms || 0),
              availableRooms: (mergedRooms && mergedRooms.length > 0) ? mergedRooms.filter((r) => r.status === 'Available').length : (prop.availableRooms !== undefined ? prop.availableRooms : loadedRooms.filter((r) => r.status === 'Available').length),
              rating: Number(prop.rating) || prev.rating || 5.0,
              image: mergedImages[0] || prev.image || prop.image || '',
              images: mergedImages,
              instagramVideoUrl: prev.instagramVideoUrl || prop.instagramVideoUrl || '',
              description: prev.description || prop.description || prop.bio || '',
              facilities: mergedFacilities,
              amenities: mergedFacilities,
              rules: mergedRules,
              roomRates: mergedRates,
              rooms: mergedRooms,
              status: prop.status || prev.status || 'Pending Approval',
              isApproved: prop.status === 'Approved' || Boolean(prop.isApproved),
            };

            saveDraftToStorage(updated, activeStep, googleMapsUrl, user);
            return updated;
          });
        }
      } catch (err) {
        console.warn('Could not prefill host:', err);
      }
    }
    loadExisting();
  }, [user?.email, user?.name, user?.phone]);

  const showToast = (msg, type = 'info') => {
    // Suppress error toasts on upload form as each error is already highlighted inline with the fields
    if (
      type === 'error' ||
      msg.toLowerCase().includes('error') ||
      msg.toLowerCase().includes('correct') ||
      msg.toLowerCase().includes('must') ||
      msg.toLowerCase().includes('required') ||
      msg.toLowerCase().includes('please')
    ) {
      return;
    }
    if (type === 'success' || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('⭐')) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  };

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
    const rawUrl = googleMapsUrl.trim();
    if (!rawUrl) {
      showToast('Please paste a Google Maps link first.', 'error');
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
            // Auto-fill address fields returned by progressive geocoding fallback
            if (res.roadArea || res.city || res.state || res.pincode) {
              setFormData((prev) => ({
                ...prev,
                roadArea: res.roadArea || prev.roadArea,
                city: res.city || prev.city,
                state: res.state || prev.state,
                pincode: res.pincode || prev.pincode,
              }));
            }
          }
        } catch (apiErr) {
          console.warn('Backend link resolve note:', apiErr);
        }
      }

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        showToast('Could not extract coordinates from this Google Maps link.', 'error');
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
            roadArea: detectedAddr.roadArea ? detectedAddr.roadArea.trim() : prev.roadArea,
            city: detectedAddr.city ? detectedAddr.city.trim() : prev.city,
            state: detectedAddr.state ? detectedAddr.state.trim() : prev.state,
            pincode: detectedAddr.pincode ? detectedAddr.pincode.trim() : prev.pincode,
          }));
        }
      } catch (revErr) {
        console.warn('Reverse geocode error:', revErr);
      }

      showToast(`Exact location imported (${fixedLat}, ${fixedLng}) & address auto-filled!`, 'success');
    } catch (err) {
      console.error('Import Google Maps error:', err);
      showToast(`Failed to import location: ${err.message}`, 'error');
    } finally {
      setIsImportingGMap(false);
    }
  };

  const compressImage = (file) => {
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

  const validate16x9Ratio = (file) => {
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
              message: 'Photos must be in 16:9 only',
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
        showToast(validation.message, 'error');
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

  const handleAddFacility = (e) => {
    e?.preventDefault?.();
    const clean = newFacilityInput.trim();
    if (!clean) return;
    if ((formData.facilities || []).some((f) => f.toLowerCase() === clean.toLowerCase())) {
      showToast('This facility is already added.');
      return;
    }
    const updated = [...(formData.facilities || []), clean];
    setFormData((prev) => ({
      ...prev,
      facilities: updated,
      amenities: updated,
    }));
    setNewFacilityInput('');
  };

  const handleRemoveFacility = (facilityName, e) => {
    e?.preventDefault?.();
    const updated = (formData.facilities || []).filter((f) => f !== facilityName);
    setFormData((prev) => ({
      ...prev,
      facilities: updated,
      amenities: updated,
    }));
  };

  const handleAddRule = (e) => {
    e?.preventDefault?.();
    const clean = newRuleInput.trim();
    if (!clean) return;
    if ((formData.rules || []).some((r) => r.toLowerCase() === clean.toLowerCase())) {
      showToast('This rule is already added.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      rules: [...(prev.rules || []), clean],
    }));
    setNewRuleInput('');
  };

  const handleRemoveRule = (ruleIndex, e) => {
    e?.preventDefault?.();
    setFormData((prev) => ({
      ...prev,
      rules: (prev.rules || []).filter((_, i) => i !== ruleIndex),
    }));
  };


  // Room Categories & Inventory Handlers (Parity with HostRoomsPage / HostDashboard)
  const handleAddNewCategory = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    let newIdx = 0;
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      const newRate = {
        _id: newId,
        type: '',
        price: '',
        rateUnit: '/month',
        capacity: 1,
      };
      const updatedRates = [...currentRates, newRate];
      newIdx = updatedRates.length - 1;
      return { ...prev, roomRates: updatedRates };
    });

    const nextCollapsed = {};
    for (let i = 0; i <= newIdx; i++) {
      nextCollapsed[i] = i !== newIdx;
    }
    setSelectedCategoryIndex(newIdx);
    setCollapsedCategories(nextCollapsed);
    showToast('New room type created! Fill in the category name and price.', 'success');
  };

  const handleRemoveCategory = (index) => {
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      const removed = currentRates[index];
      if (!removed) return prev;
      currentRates.splice(index, 1);

      // Filter out only rooms strictly belonging to this category and re-index higher categories
      const updatedRooms = (Array.isArray(prev.rooms) ? prev.rooms : [])
        .filter((r) => !isRoomMatchingCategory(r, removed, index, prev.roomRates))
        .map((r) => {
          if (typeof r.categoryIndex === 'number' && r.categoryIndex > index) {
            return { ...r, categoryIndex: r.categoryIndex - 1 };
          }
          return r;
        });

      return {
        ...prev,
        roomRates: currentRates,
        rooms: updatedRooms,
        totalRooms: updatedRooms.length,
        availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
      };
    });

    const nextCollapsed = {};
    const totalRemaining = Math.max(0, (formData.roomRates?.length || 1) - 1);
    for (let i = 0; i < totalRemaining; i++) {
      nextCollapsed[i] = true;
    }
    setCollapsedCategories(nextCollapsed);
    setSelectedCategoryIndex((cur) => Math.max(0, Math.min(cur, totalRemaining - 1)));
    showToast(`Category removed.`);
  };

  const handleUpdateCategory = (index, field, value) => {
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      if (!currentRates[index]) return prev;

      const targetRate = currentRates[index];
      const targetRateId = targetRate._id || `rate_${index}`;

      if (typeof field === 'object' && field !== null) {
        currentRates[index] = { ...targetRate, _id: targetRateId, ...field };
      } else {
        currentRates[index] = { ...targetRate, _id: targetRateId, [field]: value };
      }

      const updatedRate = currentRates[index];
      const newType = typeof field === 'object' ? field.type : (field === 'type' ? value : undefined);
      const newPrice = typeof field === 'object' ? field.price : (field === 'price' ? value : undefined);
      const newRateUnit = typeof field === 'object' ? field.rateUnit : (field === 'rateUnit' ? value : undefined);
      const newCapacity = typeof field === 'object' ? field.capacity : (field === 'capacity' ? value : undefined);

      let updatedRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      updatedRooms = updatedRooms.map((r) => {
        // Strict category match prevents claiming rooms from other categories
        const isMatch = isRoomMatchingCategory(r, targetRate, index, currentRates);

        if (!isMatch) return r;

        const updated = {
          ...r,
          rateId: updatedRate._id || targetRateId,
          categoryIndex: index,
        };
        if (newType !== undefined) updated.type = newType;
        if (newPrice !== undefined) updated.price = newPrice;
        if (newRateUnit !== undefined) updated.rateUnit = newRateUnit;
        if (newCapacity !== undefined) updated.capacity = Number(newCapacity) || 1;
        return updated;
      });

      const primaryRate = currentRates[0];
      const primaryPrice = primaryRate?.price ? String(primaryRate.price).replace(/[^0-9]/g, '') : prev.price;
      const primaryUnit = primaryRate?.rateUnit || prev.rateUnit;

      return {
        ...prev,
        roomRates: currentRates,
        rooms: updatedRooms,
        price: primaryPrice || prev.price,
        rateUnit: primaryUnit || prev.rateUnit,
      };
    });
  };

  const handleAddRoomCard = (targetCategory) => {
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? prev.roomRates : [];
      const cat = targetCategory || currentRates[selectedCategoryIndex];
      if (!cat || !cat.type || !cat.type.trim()) {
        showToast('Please enter a room category name first.', 'error');
        return prev;
      }
      const rawPrice = String(cat.price || '').replace(/[^0-9]/g, '');
      if (!rawPrice || parseInt(rawPrice, 10) <= 0) {
        showToast('Please enter a valid room price first.', 'error');
        return prev;
      }
      if (!cat.rateUnit || !String(cat.rateUnit).trim()) {
        showToast('Please select a room billing cycle/unit first.', 'error');
        return prev;
      }

      const cleanCatType = cat.type.trim();
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const allExistingNumbers = new Set(
        currentRooms
          .map((r) => parseInt(String(r.roomNumber || '').replace(/[^0-9]/g, ''), 10))
          .filter((n) => !isNaN(n))
      );

      let nextNumInt = 101;
      if (allExistingNumbers.size > 0) {
        const maxNum = Math.max(...Array.from(allExistingNumbers));
        nextNumInt = maxNum + 1;
      }
      while (allExistingNumbers.has(nextNumInt)) {
        nextNumInt++;
      }
      const nextNum = String(nextNumInt);
      const formattedPrice = `₹${parseInt(rawPrice, 10).toLocaleString('en-IN')}`;
      const rateUnit = cat.rateUnit || '/month';

      const targetIdx = currentRates.findIndex((r) => (r._id && cat._id && String(r._id) === String(cat._id)) || (r.type && cat.type && r.type === cat.type));
      const resolvedCatIndex = targetIdx !== -1 ? targetIdx : (typeof selectedCategoryIndex === 'number' ? selectedCategoryIndex : 0);
      const rateId = cat._id || `rate_${Date.now()}_${resolvedCatIndex}`;

      const roomUid = `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newCard = {
        _id: roomUid,
        rateId: rateId,
        categoryIndex: resolvedCatIndex,
        roomNumber: nextNum,
        roomNumInt: nextNumInt,
        type: cleanCatType,
        price: formattedPrice,
        rateUnit: rateUnit,
        capacity: Number(cat.capacity) || 1,
        status: 'Available',
        floor: nextNumInt < 100 ? 'Floor 1' : `Floor ${Math.floor(nextNumInt / 100)}`,
      };

      const updatedRooms = [...currentRooms, newCard];

      return {
        ...prev,
        rooms: updatedRooms,
        totalRooms: updatedRooms.length,
        availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
      };
    });

    // Notify & set active selection outside setState updater to prevent double firing in StrictMode
    setSelectedRoomCardId(roomUid);
    setSelectedRoomNumber(nextNum);
    showToast(`Added Room ${nextNum} to ${cleanCatType}!`, 'success');
  };

  const handleRemoveRoomCard = (roomId, roomData) => {
    const card = (roomData && typeof roomData === 'object') ? roomData : null;
    const targetRoomNumber = card?.roomNumber || (typeof roomId === 'string' && !roomId.startsWith('room_') ? roomId : null);
    const targetId = card?._id || roomId;

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const removeIndex = currentRooms.findIndex((r) => {
        // 1. Direct _id match
        if (targetId && r._id === targetId) return true;
        if (roomId && (r._id === roomId || roomId === `room_${r.roomNumber}` || roomId === `room_${r._id}`)) return true;

        // 2. Room number match (within same category if type is present)
        if (card?.roomNumber && String(r.roomNumber).trim() === String(card.roomNumber).trim()) {
          if (card.type && r.type && String(r.type).trim().toLowerCase() !== String(card.type).trim().toLowerCase()) {
            return false;
          }
          return true;
        }
        if (targetRoomNumber && String(r.roomNumber).trim() === String(targetRoomNumber).trim()) return true;

        return false;
      });

      if (removeIndex === -1) {
        console.warn('Could not find room to remove:', { roomId, roomData, currentRooms });
        return prev;
      }

      currentRooms.splice(removeIndex, 1);

      return {
        ...prev,
        rooms: currentRooms,
        totalRooms: currentRooms.length,
        availableRooms: currentRooms.filter((r) => r.status === 'Available').length,
      };
    });

    if (selectedRoomCardId === targetId || (card?.roomNumber && selectedRoomNumber === card.roomNumber)) {
      setSelectedRoomCardId(null);
      setSelectedRoomNumber(null);
    }
    showToast(`Room ${card?.roomNumber || targetRoomNumber || ''} deleted successfully.`, 'info');
  };

  const handleUpdateRoomNumber = (roomId, newNumber, idx, roomData) => {
    const card = (roomData && typeof roomData === 'object') ? roomData : null;
    const targetId = card?._id || roomId;

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        const isMatch =
          (targetId && r._id === targetId) ||
          (roomId && (r._id === roomId || roomId === `room_${r.roomNumber}`)) ||
          (card?.roomNumber && String(r.roomNumber).trim() === String(card.roomNumber).trim() && (card.type ? r.type === card.type : true));

        if (isMatch) {
          const numInt = parseInt(String(newNumber).replace(/[^0-9]/g, ''), 10);
          return {
            ...r,
            roomNumber: String(newNumber),
            roomNumInt: isNaN(numInt) ? r.roomNumInt : numInt,
            floor: !isNaN(numInt) ? (numInt < 100 ? 'Floor 1' : `Floor ${Math.floor(numInt / 100)}`) : r.floor,
          };
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleUpdateRoomCapacity = (roomId, newCapacity, cIdx, roomData) => {
    const cap = Math.max(1, Math.min(10, Number(newCapacity) || 1));
    const card = (roomData && typeof roomData === 'object') ? roomData : null;
    const targetId = card?._id || roomId;

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        const isMatch =
          (targetId && r._id === targetId) ||
          (roomId && (r._id === roomId || roomId === `room_${r.roomNumber}`)) ||
          (card?.roomNumber && String(r.roomNumber).trim() === String(card.roomNumber).trim() && (card.type ? r.type === card.type : true));

        if (isMatch) {
          return { ...r, capacity: cap };
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const toggleCollapseCategory = (index, e) => {
    if (e) e.stopPropagation();
    setCollapsedCategories((prev) => {
      const isCurrentlyOpen = prev[index] === false;
      const next = {};
      (formData?.roomRates || []).forEach((_, i) => {
        next[i] = isCurrentlyOpen ? true : i !== index;
      });
      return next;
    });
  };

  // Step Validation & Forward Progression
  const validateStep = (stepNumber, shouldSetErrors = true) => {
    if (stepNumber === 1) {
      const cleanHostPhone = (formData.phone || '').trim().replace(/\D/g, '');
      const raw10Phone = cleanHostPhone.length === 12 && cleanHostPhone.startsWith('91') ? cleanHostPhone.slice(2) : cleanHostPhone;

      if (!formData.name || formData.name.trim().length < 2) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, name: 'Host name is required (min 2 characters).' }));
        }
        return false;
      }

      if (!raw10Phone || raw10Phone.length < 10) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, phone: 'Host contact number must be at least 10 digits.' }));
        }
        return false;
      }

      if (!formData.propertyName || formData.propertyName.trim().length < 3) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, propertyName: 'Property name must be at least 3 characters long.' }));
        }
        return false;
      }
      if (!formData.propertyType) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, propertyType: 'Please select a property category (e.g. PG, Hotel, Flat).' }));
        }
        return false;
      }
      if (!formData.genderType) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, genderType: 'Please select who this stay is available for.' }));
        }
        return false;
      }
      return true;
    }

    if (stepNumber === 2) {
      const errors = {};
      if (!formData.roadArea || formData.roadArea.trim().length < 2) errors.roadArea = 'Street / Road name is required.';
      if (!formData.city || formData.city.trim().length < 2) errors.city = 'City is required.';
      if (!formData.state || formData.state.trim().length < 2) errors.state = 'State is required.';
      if (!formData.pincode || formData.pincode.trim().length < 4) errors.pincode = 'Valid PIN code is required.';

      if (Object.keys(errors).length > 0) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, ...errors }));
        }
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      const facilities = (formData.facilities && formData.facilities.length > 0) ? formData.facilities : formData.amenities;
      if (!facilities || facilities.length === 0) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, facilities: 'Please select at least 1 facility/amenity.' }));
        }
        return false;
      }
      if (!formData.rules || formData.rules.length === 0) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, rules: 'Please select at least 1 house rule.' }));
        }
        return false;
      }
      return true;
    }

    if (stepNumber === 4) {
      if (!formData.images || formData.images.length === 0) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, images: 'Please upload at least 1 showcase photo.' }));
        }
        return false;
      }
      return true;
    }

    if (stepNumber === 5) {
      if (!formData.description || formData.description.trim().length < 10) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, description: 'Description must be at least 10 characters long.' }));
        }
        return false;
      }
      const validRates = (formData.roomRates || []).filter((r) => (r.type || '').trim());
      if (validRates.length === 0) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, roomRates: 'Please configure at least 1 room category.' }));
        }
        return false;
      }
      const validRooms = (formData.rooms || []).filter((rm) => (rm.roomNumber || '').trim());
      if (validRooms.length === 0) {
        if (shouldSetErrors) {
          setFieldErrors((prev) => ({ ...prev, rooms: 'Please add at least 1 room card.' }));
        }
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    setFieldErrors({});
    const isValid = validateStep(activeStep, true);
    if (!isValid) return;

    if (activeStep < 5) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleSelectStep = (targetStepId) => {
    if (targetStepId === activeStep) return;
    setActiveStep(targetStepId);
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
      showToast('Please fill Host details first (Contact phone number is required).', 'error');
      return;
    }

    // Verify all 5 steps are completely filled before submitting
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setActiveStep(s);
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

    const isAlreadyApproved = formData.status === 'Approved' || Boolean(formData.isApproved);
    const targetStatus = isAlreadyApproved ? 'Approved' : 'Pending Approval';

    try {
      setIsSubmitting(true);
      const res = await adminAPI.createHost({
        ...formData,
        name: formData.name.trim(),
        email: (formData.email || user?.email || '').trim().toLowerCase(),
        phone: formattedHostPhone,
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

        if (user && updateUserSession) {
          updateUserSession({
            ...user,
            role: 'host',
            hasProperty: true,
            phone: formattedHostPhone || user.phone,
          });
        }
        showToast('Property Saved');
        setTimeout(() => {
          navigate('/host/dashboard', { state: { updatedHost: res.host || formData } });
        }, 1200);
      } else {
        showToast(res?.message || 'Error submitting property request.');
      }
    } catch (err) {
      console.error('Error submitting host upload request:', err);
      showToast(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Allow a logged-in guest to become a host; backend converts the account role on submit.
  // (No hard block here — the upload flow handles the conversion.)

  const currentStepConfig = WIZARD_STEPS.find((s) => s.id === activeStep) || WIZARD_STEPS[0];

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0b0c10] text-slate-800 dark:text-zinc-100 host-page-scope font-body-md antialiased min-h-screen flex flex-col justify-between relative selection:bg-[#006C4A] selection:text-white transition-colors duration-300">

      {/* ── Top Header Navigation Bar (Single seamless background with page body) ── */}
      <header className="sticky top-0 z-40 w-full bg-[#f8f9fa] dark:bg-[#0b0c10] border-b-0 h-18 sm:h-20 px-3 sm:px-6 lg:px-8 flex items-center justify-between select-none">
        {/* Left Action: Return to Dashboard */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              saveDraftToStorage(formData, activeStep, googleMapsUrl, user);
              navigate('/host/dashboard');
            }}
            className="flex items-center justify-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 font-bold text-sm sm:text-base cursor-pointer active:scale-95 transition-all shadow-xs shrink-0"
            title="Save draft and return to dashboard"
          >
            <ArrowLeft className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-700 dark:text-zinc-200" />
            <span className="hidden sm:inline">Exit to Dashboard</span>
            <span className="sm:hidden font-bold">Exit</span>
          </button>
        </div>

        {/* Center: Desktop Stepper Tabs (md+) & Mobile Center Step Count Text-Only */}
        <div className="flex items-center justify-center min-w-0">
          {/* Desktop Stepper Navigation Tabs (Centered) */}
          <div className="hidden md:flex items-center">
            <HostUploadTabs
              steps={WIZARD_STEPS}
              activeStep={activeStep}
              onSelectStep={handleSelectStep}
              isStepCompleted={(stepId) => validateStep(stepId, false)}
            />
          </div>

          {/* Mobile Center Step Count: Text Only (Non-clickable) */}
          <div className="md:hidden text-center select-none py-1.5 px-2">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-wider uppercase">
              Step {activeStep} of {WIZARD_STEPS.length}
            </span>
          </div>
        </div>

        {/* Right Action: Theme Toggle + User Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <ThemeTogglePill />
          <div className="relative flex items-center justify-center">
            <Login />
          </div>
        </div>
      </header>

      {/* ── Mobile Vertical Navbar Left Drawer ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden pointer-events-auto"
            />

            {/* Slide-out Left Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[82vw] max-w-xs bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between p-4 md:hidden pointer-events-auto select-none overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      RS
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        Upload Steps
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Step {activeStep} of {WIZARD_STEPS.length}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Close steps menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Stepper Navigation Vertical List */}
                <nav aria-label="Mobile Onboarding Stepper" className="space-y-1.5">
                  {WIZARD_STEPS.map((step) => {
                    const isActive = step.id === activeStep;
                    const isCompleted = validateStep(step.id, false);

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          handleSelectStep(step.id);
                          setMobileNavOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-950 dark:text-white shadow-xs font-bold'
                            : 'hover:bg-slate-100/70 dark:hover:bg-zinc-900/60 border border-transparent text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isActive
                              ? 'bg-[#006C4A] text-white shadow-xs'
                              : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {isCompleted && !isActive ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            step.id
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${isActive ? 'text-[#006C4A] dark:text-emerald-300 font-bold' : 'text-slate-800 dark:text-zinc-200'}`}>
                              {step.shortTitle || step.title}
                            </span>
                            {isActive && (
                              <span className="text-[9.5px] uppercase tracking-wider font-extrabold text-[#006C4A] dark:text-emerald-400">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                            {step.sub}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Footer Progression */}
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  <span>Overall Progress</span>
                  <span className="font-mono-data font-bold text-[#006C4A] dark:text-emerald-400">
                    {Math.round(((activeStep - 1) / (WIZARD_STEPS.length - 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#006C4A] rounded-full transition-all duration-300"
                    style={{ width: `${((activeStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Fixed Step Editorial Header (Airbnb-style bold & calm typography with smooth tab transition) ── */}
      <section className="w-full shrink-0 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-heading-${activeStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center space-y-1 sm:space-y-2"
          >
            {/* Main Step Headline - Large & Balanced for Mobile */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {currentStepConfig.sub || currentStepConfig.title}
            </h1>

            {/* Step Subtitle / Description - Easy to Read on Mobile */}
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
              {currentStepConfig.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Main Viewport-Fitted Canvas (Natural Smooth Scroll, Generous Bottom Padding) ── */}
      <main
        className="flex-1 w-full relative z-10 max-md:bg-[#3d0c40] max-md:rounded-t-[2.5rem] max-md:shadow-[0_-8px_40px_rgba(61,12,64,0.4)] max-md:px-4 max-md:py-6 max-md:pb-32 md:max-w-6xl md:mx-auto md:px-4 md:sm:px-6 md:lg:px-8 md:py-2 md:sm:py-4 md:pb-32 md:sm:pb-36"
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
                newRuleInput={newRuleInput}
                setNewRuleInput={setNewRuleInput}
                onAddRule={handleAddRule}
                onRemoveRule={handleRemoveRule}
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
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* ── Fixed Bottom Progression Bar (Airbnb visual reference: screenshots 1 & 2) ── */}
      <footer
        className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-md max-md:bg-[#3d0c40]/95 max-md:border-t max-md:border-purple-400/20 max-md:shadow-[0_-4px_25px_rgba(61,12,64,0.4)] md:bg-[#f8f9fa]/95 md:dark:bg-[#0b0c10]/95 md:border-t md:border-slate-200/60 md:dark:border-zinc-800/60 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(255,255,255,0.02)]"
      >
        {/* Hairline Continuous Progress Indicator Line */}
        <div className="w-full h-1 relative overflow-hidden max-md:bg-purple-900/60 md:bg-slate-100 md:dark:bg-zinc-800">
          <motion.div
            className="h-full bg-gradient-to-r from-[#006C4A] to-teal-500 rounded-r-full transition-all duration-300"
            style={{ width: `${(activeStep / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Left Action: Back Button or Auto-save Draft Status */}
          <div className="flex items-center">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setActiveStep((prev) => Math.max(1, prev - 1));
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-sm sm:text-base underline underline-offset-4 cursor-pointer active:scale-95 transition-all max-md:text-purple-200 max-md:hover:text-white md:text-slate-800 md:dark:text-zinc-200 md:hover:text-black md:dark:hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium pl-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Draft auto-saved securely</span>
                <span className="sm:hidden">Draft saved</span>
              </div>
            )}
          </div>

          {/* Center Info: Step overview badge (Desktop only) */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 dark:text-zinc-400">
              {currentStepConfig.title}
            </span>
          </div>

          {/* Right Action: Next / Publish Button (Airbnb-inspired high-contrast pill button) */}
          <div className="flex items-center">
            {activeStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="h-12 sm:h-13 px-8 sm:px-10 rounded-full bg-[#006C4A] hover:bg-[#005a3e] active:bg-[#004d35] text-white font-extrabold text-sm sm:text-base shadow-sm shadow-[#006C4A]/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="h-12 sm:h-13 px-8 sm:px-11 rounded-full bg-[#006C4A] hover:bg-[#005a3e] active:bg-[#004d35] text-white font-extrabold text-sm sm:text-base shadow-md shadow-[#006C4A]/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Update Listing</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Publish Listing</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HostUploadPage;
