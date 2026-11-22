import { z } from 'zod';
import { saveImagesToIndexedDB, clearImagesFromIndexedDB } from './draftStorage';

export const MAX_PHOTOS = 4;
export const MAX_DESCRIPTION_CHARS = 200;

export const WIZARD_STEPS = [
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
    desc: 'Upload up to 4 photos and add an Instagram Reel or YouTube walkthrough tour link.',
  },
  {
    id: 5,
    key: 'rooms',
    title: 'Rooms, Pricing & Review',
    shortTitle: 'Rooms & Pricing',
    sub: 'Room categories & pricing',
    desc: 'Configure your room rates and room cards, then review before publishing live.',
  },
  {
    id: 6,
    key: 'upi',
    title: 'UPI & Payment Setup',
    shortTitle: 'UPI & Payments',
    sub: 'Direct UPI payment setup',
    desc: 'Configure your UPI ID and display name to receive direct tenant bookings and rent.',
  },
];

export const hostPropertySchema = z
  .object({
    name: z.string().trim().min(2, 'Please fill Host name first (at least 2 characters)'),
    email: z.string().trim().email('Please enter a valid host email address'),
    phone: z.string().trim().min(10, 'Please fill Host details first (Contact number must be at least 10 digits)'),
    propertyName: z.string().trim().min(3, 'Property name must be at least 3 characters'),
    propertyType: z.enum(['PG', 'Hotel', 'Flat', 'Independent Room']),
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
    description: z
      .string()
      .trim()
      .min(10, 'Property description must be at least 10 characters')
      .max(MAX_DESCRIPTION_CHARS, `Property description cannot exceed ${MAX_DESCRIPTION_CHARS} characters`),
    upiId: z
      .string()
      .trim()
      .min(3, 'UPI ID is required')
      .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID format (e.g. user@bank)')
      .optional()
      .or(z.literal('')),
    payeeName: z.string().trim().min(2, 'Payee display name must be at least 2 characters').max(20, 'Payee display name cannot exceed 20 characters').optional().or(z.literal('')),
  })
  .passthrough();

export const DEFAULT_HOST_FORM_DATA = {
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
  upiId: '',
  payeeName: '',
  facilities: [],
  amenities: [],
  rules: [],
  roomRates: [],
  rooms: [],
  status: 'Pending Approval',
  isApproved: false,
};

export const CANONICAL_DRAFT_KEY = 'roomscout_host_upload_draft';

export const getDraftStorageKey = (user) => {
  if (user?.email) return `roomscout_upload_draft_${user.email.trim().toLowerCase()}`;
  if (user?._id) return `roomscout_upload_draft_${user._id}`;
  return 'roomscout_upload_draft_guest';
};

export const saveDraftToStorage = (formData, activeStep, googleMapsUrl, user) => {
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

    const email = (user?.email || '').trim().toLowerCase();
    const id = (user?._id || '').toString();

    // Asynchronously persist uploaded images in IndexedDB strictly scoped to this user
    if (Array.isArray(formData.images)) {
      saveImagesToIndexedDB(formData.images, email || id || 'guest');
    }

    const payload = JSON.stringify({
      formData,
      activeStep,
      googleMapsUrl,
      userEmail: email,
      userId: id,
      updatedAt: Date.now(),
    });

    const primaryKey = getDraftStorageKey(user);
    localStorage.setItem(primaryKey, payload);
    if (email) localStorage.setItem(`roomscout_upload_draft_${email}`, payload);
    if (id) localStorage.setItem(`roomscout_upload_draft_${id}`, payload);
    localStorage.setItem(CANONICAL_DRAFT_KEY, payload);
  } catch (storageErr) {
    if (storageErr && (storageErr.name === 'QuotaExceededError' || storageErr.code === 22)) {
      try {
        const safeData = {
          ...formData,
          images: (formData.images || []).filter((img) => typeof img === 'string' && img.startsWith('http')),
          image: typeof formData.image === 'string' && formData.image.startsWith('http') ? formData.image : '',
        };
        const email = (user?.email || '').trim().toLowerCase();
        const id = (user?._id || '').toString();
        const safePayload = JSON.stringify({
          formData: safeData,
          activeStep,
          googleMapsUrl,
          userEmail: email,
          userId: id,
          updatedAt: Date.now(),
        });
        const primaryKey = getDraftStorageKey(user);
        localStorage.setItem(primaryKey, safePayload);
      } catch {
        /* ignore */
      }
    }
  }
};

export const clearDraftFromStorage = (user) => {
  try {
    localStorage.removeItem(CANONICAL_DRAFT_KEY);
    if (user?._id) localStorage.removeItem(`roomscout_upload_draft_${user._id}`);
    if (user?.email) {
      localStorage.removeItem(`roomscout_upload_draft_${user.email}`);
      localStorage.removeItem(`roomscout_upload_draft_${user.email.trim().toLowerCase()}`);
    }
    localStorage.removeItem('roomscout_upload_draft_guest');
    clearImagesFromIndexedDB(user?.email || user?._id || 'guest');
  } catch {
    /* ignore */
  }
};

export const loadDraftFromStorage = (user) => {
  try {
    const targetEmail = (user?.email || '').trim().toLowerCase();
    const targetId = (user?._id || '').toString();

    // 1. If user is authenticated, search only user-scoped keys
    if (targetEmail || targetId) {
      const candidateKeys = [];
      if (targetEmail) candidateKeys.push(`roomscout_upload_draft_${targetEmail}`);
      if (targetId) candidateKeys.push(`roomscout_upload_draft_${targetId}`);

      for (const key of candidateKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.formData) {
            const draftEmail = (parsed.userEmail || '').trim().toLowerCase();
            const draftId = (parsed.userId || '').toString();
            if (
              (targetEmail && draftEmail && draftEmail === targetEmail) ||
              (targetId && draftId && draftId === targetId)
            ) {
              return parsed;
            }
          }
        }
      }

      // Check canonical key ONLY if it strictly belongs to this logged-in user
      const rawCanonical = localStorage.getItem(CANONICAL_DRAFT_KEY);
      if (rawCanonical) {
        const parsedCanonical = JSON.parse(rawCanonical);
        if (parsedCanonical && typeof parsedCanonical === 'object' && parsedCanonical.formData) {
          const draftEmail = (parsedCanonical.userEmail || '').trim().toLowerCase();
          const draftId = (parsedCanonical.userId || '').toString();
          if (
            (targetEmail && draftEmail && draftEmail === targetEmail) ||
            (targetId && draftId && draftId === targetId)
          ) {
            return parsedCanonical;
          } else {
            // Discard stale canonical draft from another user
            localStorage.removeItem(CANONICAL_DRAFT_KEY);
          }
        }
      }

      return null;
    }

    // 2. Unauthenticated guest fallback
    const rawGuest = localStorage.getItem('roomscout_upload_draft_guest');
    if (rawGuest) {
      const parsed = JSON.parse(rawGuest);
      if (parsed && typeof parsed === 'object' && parsed.formData && !parsed.userEmail && !parsed.userId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read upload draft:', err);
  }
  return null;
};

export const reconcileRoomsWithRates = (rawRooms, rawRates) => {
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
