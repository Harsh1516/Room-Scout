import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminAPI, staysAPI } from '../services/api';
import { MapLocationPicker } from '../components/MapLocationPicker';
import { Login } from '../components/navbar/Login';
import { Left } from '../components/navbar/Left';
import { toast } from '../context/ToastContext';

const MAX_PHOTOS = 5;
const MAX_DESCRIPTION_WORDS = 300;

const COMMON_RULE_PRESETS = [
  'Valid Govt ID Required at Check-in',
  'Gate Closes at 10:30 PM',
  'No Smoking or Alcohol Inside',
  'Visitors Allowed Till 8:00 PM',
  'Maintain Quiet Hours After 11:00 PM',
  'Keep Common Areas & Washrooms Clean',
];

const PRESET_IMAGES = [
  { label: 'Mountain Chalet', url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', slot: '1. Cover / Exterior' },
  { label: 'Lakeside Villa', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', slot: '2. Bedroom Setup' },
  { label: 'Modern PG Room', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80', slot: '3. Washroom & Hygiene' },
  { label: 'Hostel Dining', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', slot: '4. Common / Mess Area' },
  { label: 'Balcony View', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', slot: '5. Balcony / Campus View' },
];

const PROPERTY_TYPES = ['PG', 'Hostel', 'Hotel', 'Villa', 'Resort', 'Flat'];

const GENDER_OPTIONS = [
  { label: 'Boys Only', value: 'Boys' },
  { label: 'Girls Only', value: 'Girls' },
  { label: 'Both / Unisex', value: 'Both' },
  { label: 'Family', value: 'Family' },
];

const DEFAULT_FACILITIES = [
  'Attached Bathroom',
];

// Helper to generate default room layout
function generateDefaultRooms(total = 6, availableCount = 6, ratesList = []) {
  const rooms = [];
  const rates = Array.isArray(ratesList) && ratesList.length > 0
    ? ratesList
    : [
        { type: 'Double Sharing Room', price: '₹4,000', rateUnit: '/month' },
        { type: 'Deluxe AC Room', price: '₹5,500', rateUnit: '/month' },
        { type: 'Full AC Room', price: '₹6,500', rateUnit: '/month' },
      ];

  for (let i = 1; i <= total; i++) {
    const floorNum = Math.ceil(i / 4);
    const roomNum = 100 * floorNum + ((i - 1) % 4 + 1);
    const rate = rates[(i - 1) % rates.length];
    rooms.push({
      id: `room_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
      roomNumber: `Room ${roomNum}`,
      roomNumInt: roomNum,
      floor: `Floor ${floorNum}`,
      type: rate.type || 'Double Sharing Room',
      price: rate.price || '₹4,000',
      rateUnit: rate.rateUnit || '/month',
      status: i <= availableCount ? 'Available' : 'Booked',
    });
  }
  return rooms;
}

// Zod Validation Schema
const hostPropertySchema = z.object({
  name: z.string().trim().min(2, 'Host name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().min(10, 'Contact number must be at least 10 digits'),
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
    .refine(
      (val) => val.trim().split(/\s+/).filter(Boolean).length <= MAX_DESCRIPTION_WORDS,
      { message: `Property description cannot exceed ${MAX_DESCRIPTION_WORDS} words` }
    ),
}).passthrough();

export function HostUploadPage() {
  const navigate = useNavigate();
  const { user, updateUserSession } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const fileInputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Custom Facility Input
  const [newFacilityInput, setNewFacilityInput] = useState('');

  // Custom Rules Input
  const [newRuleInput, setNewRuleInput] = useState('');

  // Media URL Input State
  const [newMediaUrl, setNewMediaUrl] = useState('');

  // Google Maps Import Link State
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [isImportingGMap, setIsImportingGMap] = useState(false);

  // Controls visibility of right-side address fields until URL uploaded or map pinned
  const [isAddressVisible, setIsAddressVisible] = useState(false);

  // Quick 2D Floor Generator State
  const [generatorFloors, setGeneratorFloors] = useState(2);
  const [generatorRoomsPerFloor, setGeneratorRoomsPerFloor] = useState(3);
  const [generatorStartNum, setGeneratorStartNum] = useState(101);

  // Form State with Structured Address and Geolocation
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyName: '',
    propertyType: '',
    genderType: '',
    price: '',
    rateUnit: '/month',
    // Detailed Address in Parts
    roadArea: '',
    pincode: '',
    city: '',
    state: '',
    // Geolocation Coordinates
    latitude: 29.3919,
    longitude: 79.4542,
    totalRooms: 1,
    availableRooms: 1,
    rating: '',
    image: '',
    images: [],
    instagramVideoUrl: '',
    description: '',
    facilities: [],
    amenities: [],
    rules: [],
    roomRates: [],
    rooms: [],
  });

  const hasLoadedExistingRef = useRef(false);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user?.email]);

  // Load existing property details if already registered (loaded once on mount)
  useEffect(() => {
    async function loadExisting() {
      if (!user?.email || hasLoadedExistingRef.current) return;
      hasLoadedExistingRef.current = true;
      try {
        const res = await adminAPI.getHostByEmail(user.email);
        if (res?.hasProperty && res?.host) {
          setIsEditing(true);
          const h = res.host;
          const loadedRates = Array.isArray(h.roomRates) ? h.roomRates : [];
          const loadedRooms = Array.isArray(h.rooms) ? h.rooms : [];

          setFormData((prev) => ({
            ...prev,
            name: h.name || prev.name,
            email: h.email || prev.email,
            phone: h.phone || prev.phone,
            propertyName: h.propertyName || h.properties?.[0] || '',
            propertyType: h.propertyType || '',
            genderType: h.genderType || '',
            price: h.price ? String(h.price) : (loadedRates[0]?.price ? String(loadedRates[0].price) : prev.price),
            rateUnit: h.rateUnit || loadedRates[0]?.rateUnit || '/month',
            roadArea: h.roadArea || h.address || prev.roadArea,
            pincode: h.pincode || prev.pincode,
            city: h.city || '',
            state: h.state || '',
            latitude: Number(h.latitude) || 29.39156,
            longitude: Number(h.longitude) || 79.455882,
            totalRooms: h.totalRooms || loadedRooms.length || 1,
            availableRooms: h.availableRooms !== undefined ? h.availableRooms : (loadedRooms.filter((r) => r.status === 'Available').length || 1),
            rating: Number(h.rating) || 5.0,
            image: h.image || (Array.isArray(h.images) && h.images[0]) || '',
            images: Array.isArray(h.images) ? h.images.slice(0, MAX_PHOTOS) : [],
            instagramVideoUrl: h.instagramVideoUrl || prev.instagramVideoUrl,
            description: h.description || '',
            facilities: Array.isArray(h.facilities) && h.facilities.length > 0 ? h.facilities : (Array.isArray(h.amenities) ? h.amenities : []),
            amenities: Array.isArray(h.facilities) && h.facilities.length > 0 ? h.facilities : (Array.isArray(h.amenities) ? h.amenities : []),
            rules: Array.isArray(h.rules) && h.rules.length > 0 ? h.rules : [],
            roomRates: loadedRates,
            rooms: loadedRooms,
          }));
          if (h.roadArea || h.city || h.address) {
            setIsAddressVisible(true);
          }
        }
      } catch (err) {
        console.warn('Could not prefill host:', err);
      }
    }
    loadExisting();
  }, [user?.email]);

  const showToast = (msg, type = 'info') => {
    if (type === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('correct') || msg.toLowerCase().includes('must') || msg.toLowerCase().includes('required')) {
      toast.error(msg);
    } else if (type === 'success' || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('⭐')) {
      toast.success(msg);
    } else {
      toast.info(msg);
    }
  };

  // Handle map geolocation change
  const handleMapLocationChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  // Handle auto reverse-geocoded address parts
  const handleAddressDetected = (detected) => {
    if (!detected) return;
    setIsAddressVisible(true);
    setFormData((prev) => ({
      ...prev,
      roadArea: detected.roadArea ? detected.roadArea.trim() : prev.roadArea,
      city: detected.city ? detected.city.trim() : prev.city,
      state: detected.state ? detected.state.trim() : prev.state,
      pincode: detected.pincode ? detected.pincode.trim() : prev.pincode,
    }));
    showToast('Address details & road/area updated from map!');
  };

  // Handle Google Maps Link Import
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

      // 1. First try instant client-side regex parsing
      const atMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const dataMatch = rawUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      const queryMatch = rawUrl.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      const placeMatch = rawUrl.match(/\/maps\/place\/([^/@]+)/);

      if (atMatch) {
        lat = parseFloat(atMatch[1]);
        lng = parseFloat(atMatch[2]);
      } else if (dataMatch) {
        lat = parseFloat(dataMatch[1]);
        lng = parseFloat(dataMatch[2]);
      } else if (queryMatch) {
        lat = parseFloat(queryMatch[1]);
        lng = parseFloat(queryMatch[2]);
      }

      if (placeMatch && placeMatch[1]) {
        try {
          detectedPlace = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        } catch {
          detectedPlace = placeMatch[1].replace(/\+/g, ' ');
        }
      }

      // 2. If client-side couldn't find coords (e.g. short share link like maps.app.goo.gl)
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
        showToast('Could not extract coordinates from this Google Maps link. Please make sure it is a valid Google Maps link.', 'error');
        return;
      }

      const fixedLat = parseFloat(Number(lat).toFixed(6));
      const fixedLng = parseFloat(Number(lng).toFixed(6));

      // Update form coordinates
      setFormData((prev) => ({
        ...prev,
        latitude: fixedLat,
        longitude: fixedLng,
      }));
      setIsAddressVisible(true);

      // Reverse geocode to auto-populate address parts
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'StayHub-Property-Locator/1.0' } }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            const addr = geoData.address;
            const roadParts = [
              detectedPlace || addr.building || addr.amenity || addr.house_name || addr.shop || addr.tourism || '',
              addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || '',
              addr.suburb || addr.neighbourhood || addr.residential || addr.colony || addr.sector || addr.hamlet || '',
            ].filter(Boolean);

            const road = roadParts.join(', ') || addr.road || addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.city_district || addr.village || addr.county || '';
            const state = addr.state || '';
            const postcode = addr.postcode || '';

            setFormData((prev) => ({
              ...prev,
              roadArea: road ? road.trim() : prev.roadArea,
              city: city ? city.trim() : prev.city,
              state: state ? state.trim() : prev.state,
              pincode: postcode ? postcode.trim() : prev.pincode,
            }));
          }
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

  // Client-side image optimizer to keep uploads fast and lightweight
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

  // Handle file uploads for multiple photos (Strictly Max 5 Photos)
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
            image: prev.image || compressedDataUrl,
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

  // Add photo by URL (Max 5 Photos)
  const handleAddMediaUrl = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const cleanUrl = newMediaUrl.trim();
    if (!cleanUrl) return;

    if (formData.images.length >= MAX_PHOTOS) {
      showToast(`Maximum limit of ${MAX_PHOTOS} photos reached. Remove a photo to add a new link.`);
      return;
    }

    if (formData.images.includes(cleanUrl)) {
      showToast('This photo is already in your gallery.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, cleanUrl],
      image: prev.image || cleanUrl,
    }));
    showToast('Photo added to showcase!');
    setNewMediaUrl('');
  };

  // Drag and drop state for photo reordering
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handlePhotoDragStart = (e, index) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handlePhotoDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handlePhotoDragLeave = (e, index) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handlePhotoDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedImages = [...formData.images];
    const [draggedItem] = updatedImages.splice(draggedPhotoIndex, 1);
    updatedImages.splice(targetIndex, 0, draggedItem);

    setFormData((prev) => ({
      ...prev,
      images: updatedImages,
      image: updatedImages[0], // Slot 1 is always the primary Cover Photo!
    }));

    if (targetIndex === 0) {
      showToast('⭐ Photo moved to 1st position: Set as Main Cover Photo!');
    } else {
      showToast(`Photos reordered (Slot ${draggedPhotoIndex + 1} ➔ Slot ${targetIndex + 1})!`);
    }

    setDraggedPhotoIndex(null);
    setDragOverIndex(null);
  };

  // Remove photo
  const handleRemovePhoto = (imgUrl, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setFormData((prev) => {
      const filtered = prev.images.filter((img) => img !== imgUrl);
      return {
        ...prev,
        images: filtered,
        image: filtered[0] || PRESET_IMAGES[0].url,
      };
    });
  };

  // Promote any photo directly to 1st Cover slot
  const handleSetCoverPhoto = (imgUrl, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const currentIndex = formData.images.indexOf(imgUrl);
    if (currentIndex <= 0) {
      setFormData((prev) => ({ ...prev, image: imgUrl }));
      showToast('Already the primary cover photo!');
      return;
    }
    const updated = [...formData.images];
    const [item] = updated.splice(currentIndex, 1);
    updated.unshift(item);
    setFormData((prev) => ({
      ...prev,
      images: updated,
      image: updated[0],
    }));
    showToast('⭐ Photo promoted to 1st position as Main Cover Photo!');
  };

  // Add / Remove dynamic room rate tiers
  // Add / Remove dynamic room rate tiers
  const handleAddRateTier = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      roomRates: [...(prev.roomRates || []), { type: '', price: '', rateUnit: '/month' }],
    }));
  };

  const handleRemoveRateTier = (index, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      roomRates: (prev.roomRates || []).filter((_, i) => i !== index),
    }));
  };

  const handleRateChange = (index, field, value) => {
    const updatedRates = [...formData.roomRates];
    const prevType = updatedRates[index].type;
    updatedRates[index][field] = value;

    // Sync rooms that use this rate tier
    const updatedRooms = (formData.rooms || []).map((rm) => {
      if (field === 'type' && rm.type === prevType) {
        return { ...rm, type: value };
      }
      if (field === 'price' && rm.type === updatedRates[index].type) {
        return { ...rm, price: value };
      }
      if (field === 'rateUnit' && rm.type === updatedRates[index].type) {
        return { ...rm, rateUnit: value };
      }
      return rm;
    });

    setFormData((prev) => ({
      ...prev,
      roomRates: updatedRates,
      rooms: updatedRooms,
    }));
  };

  // 🏢 2D ROOM LAYOUT HANDLERS
  // 1. Bulk Floor & Rooms Generator
  const handleGenerateRoomLayout = (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const floors = Math.max(1, Math.min(10, Number(generatorFloors) || 1));
    const perFloor = Math.max(1, Math.min(20, Number(generatorRoomsPerFloor) || 1));
    const startNum = Math.max(1, Number(generatorStartNum) || 101);
    const rates = formData.roomRates && formData.roomRates.length > 0 ? formData.roomRates : [
      { type: 'Room', price: '', rateUnit: '/month' },
    ];

    const newRooms = [];
    let count = 0;
    for (let f = 1; f <= floors; f++) {
      for (let r = 1; r <= perFloor; r++) {
        count++;
        const roomNum = startNum + (f - 1) * 100 + (r - 1);
        const rate = rates[(count - 1) % rates.length];
        newRooms.push({
          id: `room_${Date.now()}_${count}_${Math.random().toString(36).substr(2, 4)}`,
          roomNumber: `Room ${roomNum}`,
          roomNumInt: roomNum,
          floor: `Floor ${f}`,
          type: rate.type || 'Standard Room',
          price: rate.price || '₹4,000',
          rateUnit: rate.rateUnit || '/month',
          status: 'Available',
        });
      }
    }

    setFormData((prev) => ({
      ...prev,
      rooms: newRooms,
      totalRooms: newRooms.length,
      availableRooms: newRooms.length,
    }));
    showToast(`Generated ${newRooms.length} layout rooms across ${floors} floors!`, 'success');
  };

  // 2. Add individual custom room
  const handleAddCustomRoom = (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const currentRooms = Array.isArray(formData.rooms) ? formData.rooms : [];
    const nextIdx = currentRooms.length + 1;
    const floorNum = Math.ceil(nextIdx / 4);
    const defaultRate = formData.roomRates?.[0] || { type: '', price: '', rateUnit: '/month' };

    const newRoom = {
      id: `room_${Date.now()}_${nextIdx}_${Math.random().toString(36).substr(2, 4)}`,
      roomNumber: '',
      roomNumInt: nextIdx,
      floor: `Floor ${floorNum}`,
      type: defaultRate.type || '',
      price: defaultRate.price || '',
      rateUnit: defaultRate.rateUnit || '/month',
      status: 'Available',
    };

    const updatedRooms = [...currentRooms, newRoom];
    setFormData((prev) => ({
      ...prev,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    }));
    showToast('Added room row! Please enter the room number.');
  };

  // 3. Click to toggle room status between Available and Booked
  const handleToggleRoomStatus = (roomId, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? prev.rooms : [];
      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === roomId) {
          const nextStatus = rm.status === 'Available' ? 'Booked' : 'Available';
          return { ...rm, status: nextStatus };
        }
        return rm;
      });

      return {
        ...prev,
        rooms: updatedRooms,
        totalRooms: updatedRooms.length,
        availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
      };
    });
  };

  // 4. Remove single room from layout
  const handleRemoveRoom = (roomId, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? prev.rooms : [];
      const updatedRooms = currentRooms.filter((r) => r.id !== roomId);
      return {
        ...prev,
        rooms: updatedRooms,
        totalRooms: updatedRooms.length,
        availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
      };
    });
  };

  // 5. Update room property (roomNumber, floor, type)
  const handleUpdateRoom = (roomId, field, value) => {
    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? prev.rooms : [];
      const updatedRooms = currentRooms.map((rm) => {
        if (rm.id === roomId) {
          const updated = { ...rm, [field]: value };
          if (field === 'type') {
            const matchingRate = prev.roomRates.find((r) => r.type === value);
            if (matchingRate) {
              updated.price = matchingRate.price;
              updated.rateUnit = matchingRate.rateUnit || '/month';
            }
          }
          return updated;
        }
        return rm;
      });

      return {
        ...prev,
        rooms: updatedRooms,
      };
    });
  };

  // Add Facility via + icon
  const handleAddFacility = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const clean = newFacilityInput.trim();
    if (!clean) return;
    const current = formData.facilities?.length > 0 ? formData.facilities : (formData.amenities || []);
    if (current.includes(clean)) {
      showToast('This facility is already in the list.');
      return;
    }
    const updated = [...current, clean];
    setFormData((prev) => ({
      ...prev,
      facilities: updated,
      amenities: updated,
    }));
    setNewFacilityInput('');
  };

  const handleRemoveFacility = (facility, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const current = formData.facilities?.length > 0 ? formData.facilities : (formData.amenities || []);
    const updated = current.filter((f) => f !== facility);
    setFormData((prev) => ({
      ...prev,
      facilities: updated,
      amenities: updated,
    }));
  };

  // Add / Remove Manual Rules & Restrictions
  const handleAddRule = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const clean = newRuleInput.trim();
    if (!clean) return;
    if ((formData.rules || []).includes(clean)) {
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
    e?.preventDefault();
    e?.stopPropagation();
    setFormData((prev) => ({
      ...prev,
      rules: (prev.rules || []).filter((_, i) => i !== ruleIndex),
    }));
  };

  const handleAddPresetRule = (preset) => {
    const clean = (preset || '').trim();
    if (!clean) return;
    if ((formData.rules || []).includes(clean)) {
      showToast('This rule is already added.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      rules: [...(prev.rules || []), clean],
    }));
    showToast(`Added rule: "${clean}"`);
  };

  // Submit Host Property Upload Request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const formattedLocation = `${formData.city.trim()}, ${formData.state.trim()}`;
    const fullAddress = `${formData.roadArea.trim()}, ${formData.city.trim()}, ${formData.state.trim()} - ${formData.pincode.trim()}`;

    // Zod validation
    const parsedTotalRooms = Array.isArray(formData.rooms) && formData.rooms.length > 0
      ? formData.rooms.length
      : (Number(formData.totalRooms) || Number(formData.availableRooms) || 1);
    const parsedAvailableRooms = Array.isArray(formData.rooms) && formData.rooms.length > 0
      ? formData.rooms.filter((r) => r.status === 'Available').length
      : (Number(formData.availableRooms) !== undefined && !isNaN(Number(formData.availableRooms)) ? Number(formData.availableRooms) : 0);

    const result = hostPropertySchema.safeParse({
      ...formData,
      totalRooms: parsedTotalRooms,
      availableRooms: parsedAvailableRooms,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
    });

    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0]] = issue.message;
        }
      });
      setFieldErrors(errors);
      showToast(result.error.issues[0]?.message || 'Please correct the highlighted fields.');
      return;
    }

    if (parsedAvailableRooms > parsedTotalRooms) {
      showToast('Available rooms cannot be greater than Total rooms.');
      return;
    }

    const validRates = (formData.roomRates || [])
      .map((r, i) => ({
        id: r.id || `rate_${Date.now()}_${i}`,
        type: (r.type || '').trim(),
        price: (r.price || '').trim(),
        rateUnit: r.rateUnit || '/month',
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

    try {
      setIsSubmitting(true);
      const res = await adminAPI.createHost({
        ...formData,
        facilities: (formData.facilities?.length > 0 ? formData.facilities : formData.amenities) || [],
        amenities: (formData.facilities?.length > 0 ? formData.facilities : formData.amenities) || [],
        rules: formData.rules || [],
        description: formData.description?.trim() || '',
        price: String(formData.price || '').trim(),
        rateUnit: formData.rateUnit || '/month',
        roomRates: validRates,
        rooms: validRooms,
        location: formattedLocation,
        address: fullAddress,
        totalRooms: finalTotalRooms,
        availableRooms: finalAvailableRooms,
        images: (formData.images || []).slice(0, MAX_PHOTOS),
        status: validRooms.length > 0 ? 'Pending Approval' : 'Draft',
      });

      if (res?.success) {
        try {
          window.dispatchEvent(new CustomEvent('stayhub_rooms_updated'));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('stayhub_live_channel');
            bc.postMessage({ type: 'STAY_UPDATED', stayId: res?.host?.id || res?.host?._id });
            bc.close();
          }
        } catch {}

        if (user && updateUserSession) {
          updateUserSession({ ...user, role: 'host', hasProperty: true });
        }
        showToast(
          isEditing
            ? '✅ Property and host details updated and saved to database successfully!'
            : '✅ Property upload request submitted successfully! Navigating to your Host Homepage...'
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

  // 🔒 Strict Role Guard: Block Guest accounts from viewing or submitting the Host Upload form
  if (user && user.role === 'user') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">Host Account Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-6 font-medium">
            You are currently signed in as a Guest ({user.email}). Guest accounts cannot list or upload properties. Please sign in with a Property Host account.
          </p>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="w-full py-3 px-4 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md shadow-purple-600/20"
          >
            Return to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 flex flex-col font-sans font-normal w-full overflow-x-clip">
      {/* Host Portal Dedicated Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors duration-300">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
          {/* Left: Simple Back Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/host/dashboard');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              title="Back"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>

          {/* Center: Pill container matching Pic 1 style */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
            <span className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs">
              {isEditing ? 'Edit Property Details' : 'Property Registration'}
            </span>
          </div>

          {/* Right: Host Profile Dropdown Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Login />
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          noValidate
          className="space-y-6"
        >
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Property Upload
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Set exact geolocation on the satellite map, upload 5 photos, and provide your Instagram Video Tour link.
            </p>
          </div>

          {/* SECTION 1: PROPERTY DETAILS & CATEGORIZATION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span>Property Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Property Name *</label>
                <input
                  type="text"
                  required
                  value={formData.propertyName}
                  onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                  placeholder="e.g. Royal PG & Homestay"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-normal transition-colors ${
                    fieldErrors.propertyName ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {fieldErrors.propertyName && <p className="text-[10px] text-rose-500 font-medium">{fieldErrors.propertyName}</p>}
              </div>

              {/* Property Type */}
              <div className="space-y-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Property Type *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData({ ...formData, propertyType: type });
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer border text-center ${
                        formData.propertyType === type
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Preference */}
              <div className="space-y-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Available For *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData({ ...formData, genderType: g.value });
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer border text-center ${
                        formData.genderType === g.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: UNIFIED LOCATION & PROPERTY ADDRESS */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <span>Property Location & Address</span>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${isAddressVisible ? 'lg:grid-cols-12' : 'max-w-3xl mx-auto'} gap-6 items-start transition-all duration-300`}>
              {/* LEFT SIDE: GOOGLE MAPS LINK IMPORTER + MAP PICKER */}
              <div className={`${isAddressVisible ? 'lg:col-span-6' : 'w-full'} space-y-4`}>
                {/* Google Maps Link Importer */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Google Map button on the LEFT SIDE */}
                    <div className="google-circulating-border-wrapper shrink-0">
                      <div className="google-circulating-border-spinner" />
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white dark:bg-slate-900 text-xs font-normal text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <span>Search on Google Maps</span>
                        <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-normal">
                        Paste the URL below and hit upload button
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                      <input
                        type="url"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleImportGoogleMaps();
                          }
                        }}
                        placeholder="Paste Google Maps URL here (e.g. https://www.google.com/maps/...)"
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-400 font-normal transition-colors"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleImportGoogleMaps}
                      disabled={isImportingGMap}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isImportingGMap ? 'Uploading...' : 'Upload URL'}
                    </button>
                  </div>
                </div>

                {/* Interactive Leaflet Map Picker Component */}
                <MapLocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={handleMapLocationChange}
                  onAddressDetected={handleAddressDetected}
                  defaultCity={formData.city}
                  defaultState={formData.state}
                />
              </div>

              {/* RIGHT SIDE (6 COLS): ADDRESS FIELDS (REVEALED WHEN URL UPLOADED OR PINNED) */}
              {isAddressVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="lg:col-span-6 space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Road Name / Area / Colony *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.roadArea}
                      onChange={(e) => setFormData({ ...formData, roadArea: e.target.value })}
                      placeholder="e.g. Mall Road, Near Ayarpatta"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-normal transition-colors ${
                        fieldErrors.roadArea ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {fieldErrors.roadArea && <p className="text-[10px] text-rose-500 font-medium">{fieldErrors.roadArea}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* City */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Nainital"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-normal transition-colors ${
                          fieldErrors.city ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                        }`}
                      />
                      {fieldErrors.city && <p className="text-[10px] text-rose-500 font-medium">{fieldErrors.city}</p>}
                    </div>

                    {/* State */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">State *</label>
                      <input
                        type="text"
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Uttarakhand"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-normal transition-colors ${
                          fieldErrors.state ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                        }`}
                      />
                      {fieldErrors.state && <p className="text-[10px] text-rose-500 font-medium">{fieldErrors.state}</p>}
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="e.g. 263001"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-normal transition-colors ${
                        fieldErrors.pincode ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {fieldErrors.pincode && <p className="text-[10px] text-rose-500 font-medium">{fieldErrors.pincode}</p>}
                  </div>

                  {/* Full Address Preview */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Full Address Preview</label>
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
                      {formData.roadArea || formData.city || formData.state || formData.pincode ? (
                        <span>
                          {[formData.roadArea, formData.city, formData.state].filter(Boolean).join(', ')}
                          {formData.pincode ? ` - ${formData.pincode}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Address will preview here as you pin on the map or type...</span>
                      )}
                    </div>
                  </div>

                  {/* Geocoded Coordinates Card */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span>Geolocation Pin Coordinates</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">● Synced</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 truncate">
                        <span className="text-slate-400 mr-1">Lat:</span>{formData.latitude?.toFixed(6) || '29.391900'}
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 truncate">
                        <span className="text-slate-400 mr-1">Lng:</span>{formData.longitude?.toFixed(6) || '79.454200'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* SECTIONS 3 & 4: AMENITIES & RULES (SIDE BY SIDE) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* SECTION 3: AMENITIES & FACILITIES */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <span className="truncate">Facilities</span>
              </div>

              {/* Custom Facility Adder Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFacilityInput}
                  onChange={(e) => setNewFacilityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddFacility(e);
                    }
                  }}
                  placeholder="Type feature (e.g. Gym, Mess Food, Geyser)..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-normal transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddFacility}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add</span>
                </button>
              </div>

              {/* Chips List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(formData.facilities?.length > 0 ? formData.facilities : (formData.amenities || [])).map((facility, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{facility}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFacility(facility, e)}
                      className="text-slate-400 hover:text-red-500 text-xs cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* SECTION 4: RULES & RESTRICTIONS */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                  <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <span className="truncate">Rules & Restrictions</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {formData.rules?.length || 0} active rule(s)
                </span>
              </div>

              {/* Custom Rule Adder Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddRule(e);
                    }
                  }}
                  placeholder="Type a rule (e.g. Valid Govt ID required at check-in)..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-normal transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add</span>
                </button>
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_RULE_PRESETS.map((preset, idx) => {
                    const isAdded = (formData.rules || []).includes(preset);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddPresetRule(preset)}
                        disabled={isAdded}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          isAdded
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 opacity-60 cursor-default'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-2xs'
                        }`}
                      >
                        <span>{isAdded ? '✓' : '+'}</span>
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rules Chips List */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                {formData.rules && formData.rules.length > 0 ? (
                  formData.rules.map((rule, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{rule}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRule(idx, e)}
                        className="text-slate-400 hover:text-red-500 text-xs cursor-pointer p-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No custom rules added yet. Type a rule above or click any quick suggestion.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: PROPERTY PHOTOS & VIDEO TOUR */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold">Property Photos (Max 5 Photos) & Video Tour</span>
                  <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">First photo is your main cover photo. Drag photos to change order.</span>
                </div>
              </div>
              
              {/* Photo Count Tracker Badge */}
              <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                formData.images.length >= MAX_PHOTOS
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                <span>{formData.images.length} / {MAX_PHOTOS} Photos</span>
                {formData.images.length >= MAX_PHOTOS && <span className="text-[10px]">(Max Limit)</span>}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFileUpload(e);
              }}
              className="hidden"
            />

            {/* FULL WIDTH 5-PHOTO GALLERY */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold block">
                  Showcase Gallery Slots ({formData.images.length}/5):
                </label>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✦ Tip: Drag any photo to reorder or click "Set as Cover"
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {formData.images.map((imgUrl, i) => {
                  const isCover = i === 0;
                  const isBeingDragged = draggedPhotoIndex === i;
                  const isDragTarget = dragOverIndex === i;

                  return (
                    <div
                      key={`img-${imgUrl}-${i}`}
                      draggable={true}
                      onDragStart={(e) => handlePhotoDragStart(e, i)}
                      onDragOver={(e) => handlePhotoDragOver(e, i)}
                      onDragLeave={(e) => handlePhotoDragLeave(e, i)}
                      onDrop={(e) => handlePhotoDrop(e, i)}
                      className={`relative rounded-2xl overflow-hidden border-2 h-32 sm:h-36 group bg-slate-100 dark:bg-slate-800 shadow-xs cursor-grab active:cursor-grabbing transition-all select-none ${
                        isCover
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : isDragTarget
                          ? 'border-emerald-400 scale-[1.02] shadow-md ring-2 ring-emerald-400/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      } ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Property Photo ${i + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      
                      {/* Top Slot Label */}
                      <div className="absolute top-1.5 left-1.5 pointer-events-none">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                          isCover
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900/80 backdrop-blur-md text-white'
                        }`}>
                          {isCover ? '⭐ Cover' : `Slot ${i + 1}`}
                        </span>
                      </div>

                      {/* Top Right: Drag Grip & Remove Button */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-30">
                        <span className="w-5 h-5 rounded bg-slate-900/70 backdrop-blur-xs text-white/90 flex items-center justify-center text-[10px] pointer-events-none" title="Drag to reorder">
                          ⋮⋮
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleRemovePhoto(imgUrl, e)}
                          className="w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[10px] font-black leading-none cursor-pointer shadow-xs transition-transform hover:scale-110 active:scale-90 select-none"
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Cover Photo Badge / Make Cover Action */}
                      {isCover ? (
                        <span className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-0.5 rounded-md bg-emerald-600/95 text-white text-[10px] font-bold text-center shadow-xs">
                          Primary Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleSetCoverPhoto(imgUrl, e)}
                          className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded-md bg-slate-900/80 hover:bg-emerald-600 text-white text-[10px] font-semibold text-center transition-colors shadow-xs cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          Set as Cover
                        </button>
                      )}

                      {/* Drag Hover Target Overlay */}
                      {isDragTarget && (
                        <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center text-center p-1 z-20 pointer-events-none">
                          <span className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-md">
                            Drop Here
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty Photo Slots placeholders up to 5 */}
                {Array.from({ length: Math.max(0, MAX_PHOTOS - formData.images.length) }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 h-32 sm:h-36 flex flex-col items-center justify-center p-2 text-center text-slate-400 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-transform mb-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload Photo</span>
                    <span className="text-[10px] text-slate-400">Slot {formData.images.length + idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL WIDTH VIDEO TOUR LINK (YOUTUBE / INSTAGRAM) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Video Tour Link (YouTube / Instagram Reel)
                    </h4>
                    <p className="text-[10px] text-slate-400">Add a walkthrough video tour link to give students a live preview</p>
                  </div>
                </div>

                {formData.instagramVideoUrl && formData.instagramVideoUrl.trim() && (
                  <a
                    href={formData.instagramVideoUrl.startsWith('http') ? formData.instagramVideoUrl : `https://${formData.instagramVideoUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!formData.instagramVideoUrl || !formData.instagramVideoUrl.trim()) {
                        e.preventDefault();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>Preview Tour ↗</span>
                  </a>
                )}
              </div>

              <input
                type="url"
                value={formData.instagramVideoUrl}
                onChange={(e) => setFormData({ ...formData, instagramVideoUrl: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                placeholder="https://www.instagram.com/reel/... or https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500 font-normal transition-colors"
              />
            </div>
          </div>

          {/* SECTION 6: PROPERTY DESCRIPTION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold">Property Description *</span>
                  <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">Describe your living atmosphere, student environment, facilities, and locality</span>
                </div>
              </div>

              {/* Live Word / Character Counter Badge */}
              <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                formData.description && formData.description.trim().split(/\s+/).filter(Boolean).length > MAX_DESCRIPTION_WORDS
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : formData.description && formData.description.trim().split(/\s+/).filter(Boolean).length >= 250
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                <span>
                  {formData.description ? formData.description.trim().split(/\s+/).filter(Boolean).length : 0} / {MAX_DESCRIPTION_WORDS} words
                </span>
                <span className="text-[10px] opacity-70">
                  ({formData.description ? formData.description.length : 0} chars)
                </span>
                {formData.description && formData.description.trim().split(/\s+/).filter(Boolean).length > MAX_DESCRIPTION_WORDS && (
                  <span className="text-[10px] font-bold text-rose-600">(Exceeds Cap)</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                required
                rows={5}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder="Describe your property atmosphere, student-friendly living environment, nearby universities/coaching institutes, security arrangements, study rooms, food & dining quality, and neighborhood highlights..."
                className={`w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-normal leading-relaxed transition-colors resize-y ${
                  fieldErrors.description || (formData.description && formData.description.trim().split(/\s+/).filter(Boolean).length > MAX_DESCRIPTION_WORDS)
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Minimum 10 characters • Maximum {MAX_DESCRIPTION_WORDS} words</span>
                {fieldErrors.description && (
                  <span className="text-rose-500 font-semibold">{fieldErrors.description}</span>
                )}
              </div>
            </div>
          </div>

          {/* SUBMIT "REQUEST UPLOAD" BUTTON */}
          <div className="pt-3 pb-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/host/dashboard')}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
            >
              <span>
                {isSubmitting
                  ? 'Saving to Database...'
                  : isEditing
                  ? 'Update Property Details'
                  : 'Request Upload'}
              </span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default HostUploadPage;
