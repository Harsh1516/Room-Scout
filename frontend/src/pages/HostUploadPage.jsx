import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Camera, ImagePlus, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, staysAPI } from '../services/api';
import { Login } from '../components/navbar/Login';
import { toast } from '../context/ToastContext';
import { HostUploadTabs } from '../components/host/HostUploadTabs';
import { ThemeTogglePill } from '../components/common/ThemeTogglePill';
import { UploadBasicsTab } from '../components/host/upload/UploadBasicsTab';

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

// ── Interactive Particle Constellation Canvas matching First Page (LandingPage.jsx) ──
function ConstellationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: -1000, y: -1000, radius: 140 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particleCount = Math.min(50, Math.floor((width * height) / 22000));
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const isEmerald = Math.random() > 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.6 + 1.1,
        color: isEmerald ? 'rgba(16, 185, 129, ' : 'rgba(99, 102, 241, ',
        baseAlpha: Math.random() * 0.35 + 0.25,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          const forceX = (dx / dist) * force * 2;
          const forceY = (dy / dist) * force * 2;
          p.x -= forceX;
          p.y -= forceY;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(16, 185, 129, ${0.35 * (1 - dist / mouse.radius)})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.baseAlpha + ')';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distNodes = Math.hypot(p.x - p2.x, p.y - p2.y);
          const maxDist = 110;

          if (distNodes < maxDist) {
            const alpha = (1 - distNodes / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-60 dark:opacity-45 select-none"
    />
  );
}

const COMMON_RULE_PRESETS = [
  'Valid Govt ID Required at Check-in',
  'Gate Closes at 10:30 PM',
  'No Smoking or Alcohol Inside',
  'Visitors Allowed Till 8:00 PM',
  'Maintain Quiet Hours After 11:00 PM',
  'Keep Common Areas & Washrooms Clean',
];



const WIZARD_STEPS = [
  {
    id: 1,
    key: 'basics',
    title: 'Basics & Identity',
    shortTitle: 'Basics',
    sub: 'Tell us about your property',
    desc: 'Start with the core identity, property type, and guest categorization.',
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
    .max(MAX_DESCRIPTION_CHARS, `Property description cannot exceed ${MAX_DESCRIPTION_CHARS} characters`),
}).passthrough();

export function HostUploadPage() {
  const navigate = useNavigate();
  const { user, updateUserSession } = useAuth();

  const fileInputRef = useRef(null);

  // Stepper state (1 to 5)
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Room Categories & Inventory states for Step 5
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedRoomCardId, setSelectedRoomCardId] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);

  // Custom Facility & Rule Inputs
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');

  // Drag and Drop State for Photos
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Google Maps Import Link State
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [isImportingGMap, setIsImportingGMap] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
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
        const [hostRes, staysRes] = await Promise.all([
          adminAPI.getHostByEmail(user.email).catch(() => null),
          staysAPI.getHostProperties().catch(() => []),
        ]);

        let prop = null;
        if (hostRes?.hasProperty && (hostRes.host || hostRes.stay)) {
          prop = { ...(hostRes.stay || {}), ...(hostRes.host || {}) };
        } else if (Array.isArray(staysRes) && staysRes.length > 0) {
          prop = staysRes[0];
        }

        if (prop) {
          setIsEditing(true);
          const loadedRates = Array.isArray(prop.roomRates) ? prop.roomRates : [];
          const loadedRooms = Array.isArray(prop.rooms) ? prop.rooms : [];

          setFormData((prev) => ({
            ...prev,
            name: prop.name || user.name || prev.name,
            email: prop.email || user.email || prev.email,
            phone: prop.phone || user.phone || prev.phone,
            propertyName: prop.propertyName || prop.title || prop.properties?.[0] || '',
            propertyType: prop.propertyType || prop.type || 'PG',
            genderType: prop.genderType || 'Both',
            price: prop.price ? String(prop.price).replace(/[^0-9]/g, '') : (loadedRates[0]?.price ? String(loadedRates[0].price).replace(/[^0-9]/g, '') : prev.price),
            rateUnit: prop.rateUnit || loadedRates[0]?.rateUnit || '/month',
            roadArea: prop.roadArea || '',
            pincode: prop.pincode || '',
            city: prop.city || '',
            state: prop.state || '',
            latitude: Number(prop.latitude) || 29.3919,
            longitude: Number(prop.longitude) || 79.4542,
            totalRooms: prop.totalRooms || loadedRooms.length || 0,
            availableRooms: prop.availableRooms !== undefined ? prop.availableRooms : (loadedRooms.filter((r) => r.status === 'Available').length || 0),
            rating: Number(prop.rating) || 5.0,
            image: prop.image || (Array.isArray(prop.images) && prop.images[0]) || '',
            images: Array.isArray(prop.images) && prop.images.length > 0 ? prop.images.slice(0, MAX_PHOTOS) : (prop.image ? [prop.image] : []),
            instagramVideoUrl: prop.instagramVideoUrl || '',
            description: prop.description || prop.bio || '',
            facilities: Array.isArray(prop.facilities) && prop.facilities.length > 0 ? prop.facilities : (Array.isArray(prop.amenities) ? prop.amenities : prev.facilities),
            amenities: Array.isArray(prop.facilities) && prop.facilities.length > 0 ? prop.facilities : (Array.isArray(prop.amenities) ? prop.amenities : prev.amenities),
            rules: Array.isArray(prop.rules) && prop.rules.length > 0 ? prop.rules : [],
            roomRates: loadedRates,
            rooms: loadedRooms,
          }));
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
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'RoomScout-Property-Locator/1.0' } }
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

  // Room Categories & Inventory Handlers (Parity with HostRoomsPage / HostDashboard)
  const handleAddNewCategory = () => {
    const newId = `rate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const currentRates = Array.isArray(formData.roomRates) ? [...formData.roomRates] : [];
    const newRate = {
      id: newId,
      _id: newId,
      type: '',
      price: '',
      rateUnit: '/month',
      capacity: 1,
    };
    const updatedRates = [...currentRates, newRate];
    const newIdx = updatedRates.length - 1;
    setFormData((prev) => ({ ...prev, roomRates: updatedRates }));
    setSelectedCategoryIndex(newIdx);
    setCollapsedCategories((prev) => ({ ...prev, [newIdx]: false }));
    showToast('New room type created! Fill in the category name and price.', 'success');
  };

  const handleRemoveCategory = (index) => {
    const currentRates = Array.isArray(formData.roomRates) ? [...formData.roomRates] : [];
    const removed = currentRates[index];
    if (!removed) return;
    currentRates.splice(index, 1);

    const removedRateId = removed.id || removed._id;
    const removedType = (removed.type || '').trim().toLowerCase();

    const updatedRooms = (Array.isArray(formData.rooms) ? formData.rooms : []).filter((r) => {
      if (removedRateId && r.rateId && (r.rateId === removedRateId || (removed._id && String(r.rateId) === String(removed._id)))) return false;
      if (removedType && r.type && String(r.type).trim().toLowerCase() === removedType) return false;
      if (typeof r.categoryIndex === 'number' && r.categoryIndex === index) return false;
      return true;
    });

    setFormData((prev) => ({
      ...prev,
      roomRates: currentRates,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    }));
    setSelectedCategoryIndex((prev) => Math.max(0, Math.min(prev, currentRates.length - 1)));
    showToast(`Category removed.`);
  };

  const handleUpdateCategory = (index, field, value) => {
    setFormData((prev) => {
      const currentRates = Array.isArray(prev.roomRates) ? [...prev.roomRates] : [];
      if (!currentRates[index]) return prev;

      const targetRate = currentRates[index];
      const targetRateId = targetRate.id || targetRate._id || `rate_${index}`;
      const oldType = targetRate.type;

      if (typeof field === 'object' && field !== null) {
        currentRates[index] = { ...targetRate, id: targetRateId, ...field };
      } else {
        currentRates[index] = { ...targetRate, id: targetRateId, [field]: value };
      }

      const newType = typeof field === 'object' ? field.type : (field === 'type' ? value : undefined);
      const newPrice = typeof field === 'object' ? field.price : (field === 'price' ? value : undefined);
      const newRateUnit = typeof field === 'object' ? field.rateUnit : (field === 'rateUnit' ? value : undefined);
      const newCapacity = typeof field === 'object' ? field.capacity : (field === 'capacity' ? value : undefined);

      let updatedRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      updatedRooms = updatedRooms.map((r) => {
        const isMatch =
          (r.rateId && (r.rateId === targetRateId || (targetRate._id && String(r.rateId) === String(targetRate._id)))) ||
          (oldType && r.type && String(r.type).trim().toLowerCase() === String(oldType).trim().toLowerCase()) ||
          (typeof r.categoryIndex === 'number' && r.categoryIndex === index);

        if (!isMatch) return r;

        const updated = {
          ...r,
          rateId: targetRateId,
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
    const cat = targetCategory || formData.roomRates?.[selectedCategoryIndex];
    if (!cat || !cat.type || !cat.type.trim()) {
      showToast('Please enter a room category name first.', 'error');
      return;
    }
    const rawPrice = String(cat.price || '').replace(/[^0-9]/g, '');
    if (!rawPrice || parseInt(rawPrice, 10) <= 0) {
      showToast('Please enter a valid room price first.', 'error');
      return;
    }
    if (!cat.rateUnit || !String(cat.rateUnit).trim()) {
      showToast('Please select a room billing cycle/unit first.', 'error');
      return;
    }

    const cleanCatType = cat.type.trim();
    const currentRooms = Array.isArray(formData.rooms) ? formData.rooms : [];
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

    const targetIdx = Array.isArray(formData.roomRates)
      ? formData.roomRates.findIndex((r) => (r.id && r.id === cat.id) || (cat.type && r.type === cat.type))
      : selectedCategoryIndex;
    const resolvedCatIndex = targetIdx !== -1 ? targetIdx : selectedCategoryIndex;
    const rateId = cat.id || cat._id || `rate_${resolvedCatIndex}`;

    const newCard = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
    setFormData((prev) => ({
      ...prev,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    }));
    setSelectedRoomCardId(newCard.id);
    setSelectedRoomNumber(newCard.roomNumber);
    showToast(`Added Room ${nextNum} to ${cleanCatType}!`, 'success');
  };

  const handleRemoveRoomCard = (roomId, e) => {
    e?.stopPropagation?.();
    const currentRooms = Array.isArray(formData.rooms) ? formData.rooms : [];
    const updatedRooms = currentRooms.filter((r) => r.id !== roomId && r._id !== roomId);
    setFormData((prev) => ({
      ...prev,
      rooms: updatedRooms,
      totalRooms: updatedRooms.length,
      availableRooms: updatedRooms.filter((r) => r.status === 'Available').length,
    }));
    if (selectedRoomCardId === roomId) {
      setSelectedRoomCardId(null);
      setSelectedRoomNumber(null);
    }
  };

  const handleUpdateRoomNumber = (roomId, newNumber) => {
    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        if (r.id === roomId || r._id === roomId) {
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

  const handleUpdateRoomCapacity = (roomId, newCapacity) => {
    const cap = Math.max(1, Math.min(10, Number(newCapacity) || 1));
    setFormData((prev) => {
      const currentRooms = Array.isArray(prev.rooms) ? [...prev.rooms] : [];
      const updatedRooms = currentRooms.map((r) => {
        if (r.id === roomId || r._id === roomId) {
          return { ...r, capacity: cap };
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const toggleCollapseCategory = (index, e) => {
    if (e) e.stopPropagation();
    setCollapsedCategories((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Step Validation & Forward Progression
  const validateStep = (stepNumber, showToasts = true) => {
    if (stepNumber === 1) {
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
    // Going backwards is always allowed
    if (targetStepId < activeStep) {
      setActiveStep(targetStepId);
      return;
    }
    // Going forward requires all prior steps (including activeStep) to be complete
    for (let s = 1; s < targetStepId; s++) {
      if (!validateStep(s, s === activeStep)) {
        if (s !== activeStep) {
          showToast(`Please complete Step ${s} (${WIZARD_STEPS[s - 1]?.shortTitle}) first.`, 'error');
        }
        return;
      }
    }
    setActiveStep(targetStepId);
  };

  const handlePrevStep = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1);
    }
  };

  // Submit Host Property Upload Request
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    const formattedLocation = `${formData.city.trim()}, ${formData.state.trim()}`;
    const fullAddress = `${formData.roadArea.trim()}, ${formData.city.trim()}, ${formData.state.trim()} - ${formData.pincode.trim()}`;

    const parsedTotalRooms = Array.isArray(formData.rooms) && formData.rooms.length > 0
      ? formData.rooms.length
      : (Number(formData.totalRooms) || 0);
    const parsedAvailableRooms = Array.isArray(formData.rooms) && formData.rooms.length > 0
      ? formData.rooms.filter((r) => r.status === 'Available').length
      : (Number(formData.availableRooms) || 0);

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

    const validRates = (formData.roomRates || [])
      .map((r, i) => ({
        id: r.id || `rate_${Date.now()}_${i}`,
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

    try {
      setIsSubmitting(true);
      const res = await adminAPI.createHost({
        ...formData,
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
            : '✅ Property upload request submitted successfully! Navigating to your Host Dashboard...'
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
    <div className="bg-[#fafbfc] dark:bg-[#090b10] text-slate-900 dark:text-white host-page-scope font-body-md antialiased h-screen max-h-screen flex flex-col justify-between overflow-hidden relative select-none selection:bg-custom-btn-primary selection:text-white transition-colors duration-500">
      {/* ── Interactive Particle Constellation Canvas matching First Page ── */}
      <ConstellationCanvas />

      {/* ── Top Ambient Radial Glow underglow matching LandingPage ── */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-emerald-100/40 via-teal-50/20 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 blur-3xl pointer-events-none" />
      </div>

      {/* ── Top Header Navigation Bar (Fixed, Non-Scrollable) ── */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-[#090b10]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-zinc-800 shrink-0 h-14 sm:h-16 flex items-center">
        <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left Action: Return to Host Dashboard */}
          <div className="flex items-center z-10">
            <button
              type="button"
              onClick={() => navigate('/host/dashboard')}
              className="h-9 px-3.5 sm:px-4 rounded-full border border-slate-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-label-sm text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Return to Host Dashboard"
            >
              <span className="material-symbols-outlined text-[17px] leading-none">arrow_back</span>
              <span>Back</span>
            </button>
          </div>

          {/* Stepper Navigation Tabs (Absolute Centered like Pic 1) */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
            <HostUploadTabs
              steps={WIZARD_STEPS}
              activeStep={activeStep}
              onSelectStep={handleSelectStep}
              isStepCompleted={(stepId) => validateStep(stepId, false)}
            />
          </div>

          {/* Right Action: Theme Toggle + Profile Avatar */}
          <div className="flex items-center gap-2.5 sm:gap-3 z-10">
            <ThemeTogglePill />
            <Login />
          </div>
        </div>
      </header>

      {/* ── Fixed Step Editorial Header (Strictly Centered & Locked Directly Below Navbar) ── */}
      <section className="w-full shrink-0 pt-3 sm:pt-4 pb-1 sm:pb-2 px-4 flex flex-col items-center justify-center text-center select-none z-20">
        <div className="flex flex-col items-center max-w-3xl mx-auto w-full">
          {/* Animated Step Badge */}
          <div className="flex items-center justify-center mb-1">
            <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
          <div className="min-h-[38px] flex items-center justify-center">
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
                className="font-h2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5"
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
          <div className="h-5 sm:h-6 flex items-center justify-center mt-0.5">
            <AnimatePresence mode="wait">
              <motion.p
                key={`desc-${activeStep}`}
                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="font-body-md text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-normal px-4"
              >
                {currentStepConfig.desc}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── Main Viewport-Fitted Canvas (Non-Scrollable Single-Screen) ── */}
      <main className="flex-1 min-h-0 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-2 flex flex-col justify-start relative z-10 overflow-y-auto lg:overflow-hidden">
        {/* Step Content Container with Viewport Elevation (Component Level Architecture) */}
        <AnimatePresence mode="wait">
          {activeStep === 1 && (
            <UploadBasicsTab
              formData={formData}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
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
      </main>

      {/* ── Fixed Bottom Progression Bar (Non-Scrollable, Sticky at Bottom) ── */}
      <footer className="sticky bottom-0 z-50 w-full bg-white/90 dark:bg-[#090b10]/90 backdrop-blur-xl border-t border-slate-200/70 dark:border-zinc-800 shrink-0 h-14 sm:h-16 flex items-center">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={activeStep === 1}
            className={`px-4 sm:px-5 py-2 rounded-full border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeStep === 1
                ? 'border-slate-200 dark:border-zinc-800 text-slate-400 opacity-40 cursor-not-allowed'
                : 'border-slate-300 dark:border-zinc-700 hover:border-slate-900 dark:hover:border-white text-slate-800 dark:text-zinc-200'
            }`}
          >
            <span>← Back</span>
          </button>

          <div className="flex items-center">
            {activeStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 sm:px-7 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-zinc-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Continue</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 sm:px-8 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02]"
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
        </div>
      </footer>
    </div>
  );
}

export default HostUploadPage;
