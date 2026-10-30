import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
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

const UploadLocationTab = lazy(() =>
  import('../components/host/upload/UploadLocationTab').then((m) => ({ default: m.UploadLocationTab || m.default }))
);
const UploadPerksRulesTab = lazy(() =>
  import('../components/host/upload/UploadPerksRulesTab').then((m) => ({ default: m.UploadPerksRulesTab || m.default }))
);
const UploadPhotosTab = lazy(() =>
  import('../components/host/upload/UploadPhotosTab').then((m) => ({ default: m.UploadPhotosTab || m.default }))
);
const UploadRoomsPricingTab = lazy(() =>
  import('../components/host/upload/UploadRoomsPricingTab').then((m) => ({ default: m.UploadRoomsPricingTab || m.default }))
);

function TabFallback() {
  return (
    <div className="w-full min-h-[400px] rounded-3xl bg-slate-100/60 dark:bg-zinc-900/60 animate-pulse border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        Loading Step Content...
      </span>
    </div>
  );
}

const MAX_PHOTOS = 5;
const MAX_DESCRIPTION_CHARS = 100;



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
  propertyType: z.enum(['PG', 'Hostel', 'Hotel', 'Villa', 'Resort', 'Flat']),
  genderType: z.enum(['Boys', 'Girls', 'Both', 'Family']),
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
  facilities: ['Attached Bathroom', 'High-Speed Wi-Fi', 'Power Backup'],
  amenities: ['Attached Bathroom', 'High-Speed Wi-Fi', 'Power Backup'],
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
    try {
      const draft = loadDraftFromStorage(user);
      if (draft?.activeStep && Number(draft.activeStep) >= 1 && Number(draft.activeStep) <= 5) {
        return Number(draft.activeStep);
      }
    } catch {
      /* ignore */
    }
    if (location.state?.initialStep && Number(location.state.initialStep) >= 1 && Number(location.state.initialStep) <= 5) {
      return Number(location.state.initialStep);
    }
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
            const prevRules = (Array.isArray(prev.rules) && prev.rules.length > 0) ? prev.rules : [];
            const propRules = (Array.isArray(prop.rules) && prop.rules.length > 0) ? prop.rules : [];
            const mergedRules = prevRules.length > 0 ? prevRules : propRules;

            const prevImages = (Array.isArray(prev.images) && prev.images.length > 0) ? prev.images : [];
            const mergedImages = prevImages.length > 0 ? prevImages : cleanExistingImages;

            const prevFacilities = (Array.isArray(prev.facilities) && prev.facilities.length > 0 && prev.facilities !== DEFAULT_HOST_FORM_DATA.facilities) ? prev.facilities : [];
            const propFacilities = (Array.isArray(prop.facilities) && prop.facilities.length > 0) ? prop.facilities : [];
            const mergedFacilities = prevFacilities.length > 0 ? prevFacilities : (propFacilities.length > 0 ? propFacilities : prev.facilities);

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
    if (type === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('correct') || msg.toLowerCase().includes('must') || msg.toLowerCase().includes('required')) {
      toast.error(msg);
    } else if (type === 'success' || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('⭐')) {
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
          }
        } catch (apiErr) {
          console.warn('Backend link resolve note:', apiErr);
        }
      }

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        showToast('Could not extract coordinates from this Google Maps link.', 'error');
        return;
      }

      const fixedLat = parseFloat(Number(lat).toFixed(6));
      const fixedLng = parseFloat(Number(lng).toFixed(6));

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
  const validateStep = (stepNumber, showToasts = true) => {
    if (stepNumber === 1) {
      const cleanHostPhone = (formData.phone || '').trim().replace(/\D/g, '');
      const raw10Phone = cleanHostPhone.length === 12 && cleanHostPhone.startsWith('91') ? cleanHostPhone.slice(2) : cleanHostPhone;

      if (!formData.name || formData.name.trim().length < 2) {
        if (showToasts) {
          setFieldErrors((prev) => ({ ...prev, name: 'Host name is required (min 2 characters).' }));
          showToast('Please fill Host details first (Host name is required).', 'error');
        }
        return false;
      }

      if (!raw10Phone || raw10Phone.length < 10) {
        if (showToasts) {
          setFieldErrors((prev) => ({ ...prev, phone: 'Host contact number must be at least 10 digits.' }));
          showToast('Please fill Host details first (Contact phone number is required).', 'error');
        }
        return false;
      }

      if (!formData.propertyName || formData.propertyName.trim().length < 3) {
        if (showToasts) {
          setFieldErrors((prev) => ({ ...prev, propertyName: 'Property name must be at least 3 characters long.' }));
          showToast('Please provide a valid property name (min 3 chars).', 'error');
        }
        return false;
      }
      if (!formData.propertyType) {
        if (showToasts) showToast('Please select a property type (e.g. PG, Hostel, Hotel, etc.).', 'error');
        return false;
      }
      if (!formData.genderType) {
        if (showToasts) showToast('Please select who this stay is available for.', 'error');
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
        if (showToasts) {
          setFieldErrors((prev) => ({ ...prev, ...errors }));
          showToast('Please fill in the required address fields (Street, City, State, PIN code).', 'error');
        }
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      const facilities = (formData.facilities && formData.facilities.length > 0) ? formData.facilities : formData.amenities;
      if (!facilities || facilities.length === 0) {
        if (showToasts) showToast('Please add at least 1 facility/amenity before continuing.', 'error');
        return false;
      }
      if (!formData.rules || formData.rules.length === 0) {
        if (showToasts) showToast('Please add at least 1 house rule before continuing.', 'error');
        return false;
      }
      return true;
    }

    if (stepNumber === 4) {
      if (!formData.images || formData.images.length === 0) {
        if (showToasts) showToast('Please upload at least 1 showcase photo of your property.', 'error');
        return false;
      }
      return true;
    }

    if (stepNumber === 5) {
      if (!formData.description || formData.description.trim().length < 10) {
        if (showToasts) {
          setFieldErrors((prev) => ({ ...prev, description: 'Description must be at least 10 characters long.' }));
          showToast('Please enter a property description (min 10 characters).', 'error');
        }
        return false;
      }
      const validRates = (formData.roomRates || []).filter((r) => (r.type || '').trim());
      if (validRates.length === 0) {
        if (showToasts) showToast('Please configure at least 1 room category before continuing.', 'error');
        return false;
      }
      const validRooms = (formData.rooms || []).filter((rm) => (rm.roomNumber || '').trim());
      if (validRooms.length === 0) {
        if (showToasts) showToast('Please add at least 1 room card before completing registration.', 'error');
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
      if (!validateStep(s, true)) {
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
        showToast(
          isAlreadyApproved
            ? '✅ Property details updated successfully!'
            : '✅ Property upload submitted for one-time admin approval! Navigating to your Host Dashboard...'
        );
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

  // Role Guard
  if (user && user.role === 'user') {
    return (
      <div className="h-screen max-h-screen bg-[#fafbfc] dark:bg-[#090b10] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-800/60 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">Host Account Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-6 font-medium">
            You are currently signed in as a Guest ({user.email}). Guest accounts cannot list properties.
          </p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="w-full py-3 px-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md"
          >
            Return to Explore
          </button>
        </div>
      </div>
    );
  }

  const currentStepConfig = WIZARD_STEPS.find((s) => s.id === activeStep) || WIZARD_STEPS[0];

  return (
    <div className="bg-white dark:bg-black text-slate-800 dark:text-zinc-100 host-page-scope font-body-md antialiased h-screen max-h-screen flex flex-col justify-between overflow-hidden relative select-none selection:bg-custom-btn-primary selection:text-white transition-colors duration-300">

      {/* ── Top Header Navigation Bar (Matching User Side Floating Liquid Glass Capsules) ── */}
      <header className="relative w-full h-13 sm:h-15 pointer-events-none select-none z-50 font-body-md host-font-scope antialiased">
        {/* Left Action: Return to Host Dashboard + Mobile Steps Drawer Button */}
        <div className="fixed top-3 left-2.5 sm:top-5 sm:left-6 z-50 flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none">
          <button
            type="button"
            onClick={() => navigate('/host/dashboard')}
            data-no-hover="true"
            className="apple-liquid-nav flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 dark:border-white/15 shadow-xs cursor-pointer text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm select-none active:scale-95 transition-transform"
            title="Return to Host Dashboard"
          >
            <svg
              className="w-4 h-4 text-slate-600 dark:text-slate-300 stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span className="hidden min-[380px]:inline">Back</span>
          </button>

          {/* Left Panel Vertical Navbar Switch Option for Mobile Resolutions */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden apple-liquid-nav flex items-center justify-center px-2.5 py-1.5 gap-1.5 rounded-full border border-emerald-500/30 dark:border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 shadow-xs cursor-pointer text-emerald-700 dark:text-emerald-300 font-bold text-xs select-none active:scale-95 transition-transform"
            title="Open Steps Navigation Menu"
            aria-label="Toggle vertical navigation menu"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Step {activeStep}/5</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Stepper Navigation Tabs (Absolute Centered on Desktop) */}
        <div className="hidden md:flex fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-50 items-center pointer-events-auto select-none">
          <HostUploadTabs
            steps={WIZARD_STEPS}
            activeStep={activeStep}
            onSelectStep={handleSelectStep}
            isStepCompleted={(stepId) => validateStep(stepId, false)}
          />
        </div>

        {/* Right Action: Theme Toggle + Profile Avatar */}
        <div className="fixed top-3 right-2.5 sm:top-5 sm:right-6 z-50 flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto">
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
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                      📋
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        Property Steps
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
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
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
                        className={`w-full text-left p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-950 dark:text-white shadow-xs'
                            : 'hover:bg-slate-100/70 dark:hover:bg-zinc-900/60 border border-transparent text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isActive
                              ? 'bg-[#006C4A] text-white shadow-sm shadow-[#006C4A]/30'
                              : isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {isCompleted && !isActive ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            step.id
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${isActive ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-zinc-200'}`}>
                              {step.shortTitle || step.title}
                            </span>
                            {isActive && (
                              <span className="text-[9.5px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
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
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  <span>Overall Progress</span>
                  <span className="font-mono-data font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round(((activeStep - 1) / (WIZARD_STEPS.length - 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${((activeStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Fixed Step Editorial Header (Strictly Centered & Locked Directly Below Navbar) ── */}
      <section className="w-full shrink-0 px-3 sm:px-6 lg:px-8 select-none z-20 transition-all pt-1 sm:pt-1.5 pb-0 sm:pb-0.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between relative">
          {/* Left Slot: Add Room Type button on Step 5 (Moved Upward into Header Row) */}
          <div className="w-44 hidden sm:flex items-center justify-start z-10">
            {activeStep === 5 && (
              <button
                type="button"
                onClick={handleAddNewCategory}
                className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#006C4A] hover:bg-[#005a3e] text-white border border-[#005a3e]/60 text-xs font-bold transition-all shadow-sm shadow-[#006C4A]/25 cursor-pointer active:scale-95"
                title="Add a new room type"
              >
                <span className="material-symbols-outlined text-[17px] text-white group-hover:rotate-90 transition-transform">add</span>
                <span>Add Room Type</span>
              </button>
            )}
          </div>

          {/* Centered Step Editorial Header */}
          <div className="flex flex-col items-center max-w-xl mx-auto text-center flex-1">
            {/* Animated Step Badge */}
            <div className="flex items-center justify-center mb-0.5">
              <span className="text-[9.5px] sm:text-[10px] font-mono-data font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-700/60 inline-flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Host Onboarding · Step</span>
                <span className="relative inline-block overflow-hidden h-[15px] w-3 font-extrabold text-center">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={activeStep}
                      initial={{ y: 14, opacity: 0, filter: 'blur(2px)' }}
                      animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ y: -14, opacity: 0, filter: 'blur(2px)' }}
                      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      {activeStep}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </div>

            {/* Morphing Staggered Words Title */}
            <div className="min-h-[28px] sm:min-h-[36px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={`sub-title-${activeStep}`}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.035,
                        delayChildren: 0.02,
                      },
                    },
                    exit: {
                      opacity: 0,
                      transition: {
                        staggerChildren: 0.02,
                        staggerDirection: -1,
                      },
                    },
                  }}
                  className="font-h2 text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-0.5"
                >
                  {currentStepConfig.sub.split(' ').map((word, idx) => (
                    <motion.span
                      key={`${activeStep}-${idx}-${word}`}
                      variants={{
                        hidden: { opacity: 0, y: 12, filter: 'blur(6px)', scale: 0.94 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          filter: 'blur(0px)',
                          scale: 1,
                          transition: {
                            type: 'spring',
                            stiffness: 400,
                            damping: 25,
                          },
                        },
                        exit: {
                          opacity: 0,
                          y: -10,
                          filter: 'blur(4px)',
                          scale: 0.96,
                          transition: { duration: 0.14, ease: 'easeIn' },
                        },
                      }}
                      className="inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.h1>
              </AnimatePresence>
            </div>

            {/* Smooth Subheading Description */}
            <div className="h-4 sm:h-5 flex items-center justify-center mt-0.5">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`desc-${activeStep}`}
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="font-body-md text-[11px] sm:text-xs md:text-sm text-slate-600 dark:text-zinc-400 font-normal px-2 sm:px-4"
                >
                  {currentStepConfig.desc}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Right Spacer for symmetrical balance */}
          <div className="w-44 hidden sm:block" />
        </div>
      </section>

      {/* ── Main Viewport-Fitted Canvas (Smooth Overflow Scroll, Clear Bottom Padding for Sticky Progression Bar) ── */}
      <main className="flex-1 min-h-0 w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 pb-4 sm:pb-6 flex flex-col justify-start relative z-10 overflow-y-auto custom-scrollbar">
        {/* Step Content Container with Viewport Elevation (Component Level Architecture) */}
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
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
            )}

            {activeStep === 3 && (
              <Suspense fallback={<TabFallback />}>
                <UploadPerksRulesTab
                  formData={formData}
                  newFacilityInput={newFacilityInput}
                  setNewFacilityInput={setNewFacilityInput}
                  onAddFacility={handleAddFacility}
                  onRemoveFacility={handleRemoveFacility}
                  newRuleInput={newRuleInput}
                  setNewRuleInput={setNewRuleInput}
                  onAddRule={handleAddRule}
                  onRemoveRule={handleRemoveRule}
                />
              </Suspense>
            )}

            {activeStep === 4 && (
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
            )}

            {activeStep === 5 && (
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* ── Fixed Bottom Progression Bar (Scoped Width, Upper Rounded Corners, Matching Tab Borders) ── */}
      <footer className="sticky bottom-0 z-50 w-full shrink-0 flex justify-center pointer-events-none pb-0">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.12,
            }}
            className="pointer-events-auto w-full bg-[#006C4A] dark:bg-[#005439] backdrop-blur-xl border-t border-x border-[#005439] dark:border-emerald-800/60 rounded-t-xl sm:rounded-t-2xl shadow-[0_-6px_30px_rgba(0,108,74,0.3)] h-12 sm:h-13 px-4 sm:px-6 flex items-center justify-center transition-all"
          >
            <div className="flex items-center justify-center">
              {activeStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-7 sm:px-8 py-2 rounded-full bg-white text-[#006C4A] hover:bg-emerald-50 text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Continue</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="px-8 sm:px-10 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-[#006C4A] font-extrabold text-xs sm:text-sm shadow-md shadow-black/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02]"
                >
                  <span>
                    {isSubmitting
                      ? 'Saving to Database...'
                      : isEditing
                      ? 'Update Property Details'
                      : 'Request Upload ✓'}
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

export default HostUploadPage;
