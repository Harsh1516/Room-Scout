import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Plus, Minus, Layers, MapPin } from 'lucide-react';
import { fetchAddressFromCoords } from '../utils/geoUtils';

// Fix Leaflet's default icon path issues in bundlers (Client-only / SSR Safe)
if (typeof window !== 'undefined' && L?.Icon?.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Modern Precision Pin with dynamic anchor & shadow
const createCustomPin = () => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position:relative;width:40px;height:48px;display:flex;align-items:center;justify-content:center;cursor:grab;">
        <span style="position:absolute;bottom:0px;width:14px;height:7px;background:rgba(0,0,0,0.35);border-radius:50%;filter:blur(2px);"></span>
        <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.45));">
          <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="url(#pinGrd)" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="18" cy="18" r="7" fill="#ffffff"/>
          <circle cx="18" cy="18" r="4" fill="#006C4A"/>
          <defs>
            <linearGradient id="pinGrd" x1="0" y1="0" x2="36" y2="46" gradientUnits="userSpaceOnUse">
              <stop stop-color="#006C4A"/>
              <stop offset="1" stop-color="#10b981"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -44],
  });
};

// Modern High-Resolution Maps with Crisp Hybrid Satellite & Clean Street Vector Cartography
const MAP_MODES = {
  satellite: {
    label: 'Satellite View',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8" />
        <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
      </svg>
    ),
    base: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: 'Google Maps',
  },
  street: {
    label: 'Street Map',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    base: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: 'Google Maps',
  },
};

export function MapLocationPicker({
  latitude = 29.3919,
  longitude = 79.4542,
  onLocationChange,
  onAddressDetected,
  initialMapMode = 'satellite',
  defaultCity = '',
  defaultState = '',
}) {
  if (typeof window === 'undefined') return null;

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const markerRef = useRef(null);

  // Map Mode: 'satellite' | 'street'
  const [mapMode, setMapMode] = useState(initialMapMode);

  // Reverse Geocoding helper with robust PIN code resolution
  const reverseGeocode = async (lat, lng) => {
    try {
      const detected = await fetchAddressFromCoords(lat, lng);
      if (detected && onAddressDetected) {
        onAddressDetected(detected);
      }
    } catch (e) {
      console.warn('Reverse geocoding note:', e.message);
    }
  };

  // Helper to switch map tiles
  const applyTileLayer = (mode, map) => {
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    const config = MAP_MODES[mode] || MAP_MODES.satellite;

    const baseLayer = L.tileLayer(config.base, {
      subdomains: config.subdomains || ['0', '1', '2', '3'],
      maxZoom: config.maxZoom || 21,
      maxNativeZoom: 20,
    }).addTo(map);
    baseLayerRef.current = baseLayer;
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let resizeObserver = null;

    if (!mapInstanceRef.current) {
      const initialLat = Number(latitude) || 29.3919;
      const initialLng = Number(longitude) || 79.4542;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 17,
        maxZoom: 21,
        minZoom: 4,
        zoomControl: false,
        attributionControl: false,
      });

      // Apply initial modern satellite tile layer
      applyTileLayer(mapMode, map);

      // Add Draggable Marker
      const marker = L.marker([initialLat, initialLng], {
        icon: createCustomPin(),
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:system-ui,-apple-system,sans-serif;min-width:140px;padding:2px 0;">
          <div style="font-weight:800;font-size:13px;color:#0f172a;display:flex;align-items:center;gap:4px;">
            📍 Exact Spot
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">
            Drag pin to exact roof or entrance.
          </div>
        </div>
      `);

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        const preciseLat = Number(lat);
        const preciseLng = Number(lng);
        if (onLocationChange) onLocationChange(preciseLat, preciseLng);
        reverseGeocode(preciseLat, preciseLng);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const preciseLat = Number(lat);
        const preciseLng = Number(lng);
        marker.setLatLng([preciseLat, preciseLng]);
        if (onLocationChange) onLocationChange(preciseLat, preciseLng);
        reverseGeocode(preciseLat, preciseLng);
      });

      // Keep Leaflet tiles crisp & fully drawn on dynamic container resize
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Layer when mapMode changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      applyTileLayer(mapMode, mapInstanceRef.current);
    }
  }, [mapMode]);

  // Update marker when coordinates change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const lat = Number(latitude) || 29.3919;
      const lng = Number(longitude) || 79.4542;
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  }, [latitude, longitude]);

  // Handler to center view on pin
  const handleRecenter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (markerRef.current && mapInstanceRef.current) {
      const pos = markerRef.current.getLatLng();
      mapInstanceRef.current.flyTo(pos, 17, { duration: 0.6 });
    }
  };

  return (
    <div className="w-full h-full">
      {/* Modern Interactive Map Container */}
      <div className="relative w-full h-full overflow-hidden z-0 select-none">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top Left Instructions Badge - Modern Glassmorphism */}
        <div className="absolute top-2.5 left-2.5 z-[400] bg-slate-950/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-lg border border-white/15 flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Click map or drag pin</span>
        </div>

        {/* Top Right Satellite & Street Switcher (Sleek Glass Segmented Control) */}
        <div className="absolute top-2.5 right-2.5 z-[400] bg-slate-950/85 backdrop-blur-md p-1 rounded-full shadow-xl border border-white/15 flex items-center gap-1">
          {Object.entries(MAP_MODES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMapMode(key);
              }}
              className={`h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-95 ${
                mapMode === key
                  ? 'bg-[#006C4A] text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              <span>{key === 'satellite' ? 'Satellite' : 'Street'}</span>
            </button>
          ))}
        </div>

        {/* Bottom Right Floating Modern Map Controls (Zoom + Recenter) */}
        <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-1.5">
          {/* Recenter Pin Button */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Recenter on Pin"
            aria-label="Recenter on Pin"
            className="w-9 h-9 rounded-xl bg-slate-950/85 hover:bg-slate-900 active:scale-95 text-emerald-400 backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4 fill-emerald-400/20" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              mapInstanceRef.current?.zoomIn();
            }}
            title="Zoom In"
            aria-label="Zoom in"
            className="w-9 h-9 rounded-xl bg-slate-950/85 hover:bg-slate-900 active:scale-95 text-white backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              mapInstanceRef.current?.zoomOut();
            }}
            title="Zoom Out"
            aria-label="Zoom out"
            className="w-9 h-9 rounded-xl bg-slate-950/85 hover:bg-slate-900 active:scale-95 text-white backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Bottom Left Modern Badge */}
        <div className="absolute bottom-2.5 left-2.5 z-[400] text-[10px] text-white/80 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 font-medium pointer-events-none shadow-sm flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Google Maps Engine</span>
        </div>
      </div>
    </div>
  );
}

export default MapLocationPicker;
